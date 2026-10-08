import { computed, Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';

interface RealmAccess {
  roles?: string[];
}

interface ParsedToken {
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: RealmAccess;
  exp?: number;
}

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  refresh_token?: string;
  token_type: string;
  id_token?: string;
  scope?: string;
}

const TOKEN_KEY = 'devflow_access_token';
const REFRESH_TOKEN_KEY = 'devflow_refresh_token';
const TOKEN_EXPIRY_KEY = 'devflow_token_expiry';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authenticatedState = signal(false);
  private readonly readyState = signal(false);
  private readonly tokenState = signal<string | undefined>(undefined);
  private readonly refreshTokenState = signal<string | undefined>(undefined);
  private readonly profileState = signal<ParsedToken | undefined>(undefined);
  private readonly rolesState = signal<readonly string[]>([]);
  private readonly initializationErrorState = signal<string | undefined>(undefined);
  private initialization?: Promise<void>;

  readonly isAuthenticated = this.authenticatedState.asReadonly();
  readonly isReady = this.readyState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly roles = this.rolesState.asReadonly();
  readonly initializationError = this.initializationErrorState.asReadonly();
  readonly username = computed(() => this.profileState()?.preferred_username || '');

  readonly displayName = computed(() => {
    const profile = this.profileState();
    return profile?.name || profile?.preferred_username || profile?.email || 'DevFlow user';
  });

  readonly email = computed(() => this.profileState()?.email || '');

  updateProfile(firstName: string, lastName: string, email: string): void {
    const profile = this.profileState();
    if (!profile) return;
    const name = `${firstName} ${lastName}`.trim();
    this.profileState.set({
      ...profile,
      name,
      given_name: firstName,
      family_name: lastName,
      email
    });
  }

  readonly initials = computed(() => {
    const profile = this.profileState();
    const source = profile?.given_name || profile?.preferred_username || profile?.email || 'DF';
    return source
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  initialize(): Promise<void> {
    if (this.initialization) {
      return this.initialization;
    }

    this.initialization = this.initializeSession();
    return this.initialization;
  }

  async loginWithCredentials(usernameOrEmail: string, password: string): Promise<void> {
    await this.initialize();

    const tokenEndpoint = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: environment.keycloak.clientId,
      username: usernameOrEmail.trim(),
      password,
      scope: 'openid profile email'
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const description = errorData.error_description || 'Invalid credentials or login failed';
        throw new Error(description);
      }

      const tokenData: KeycloakTokenResponse = await response.json();
      this.handleTokenSuccess(tokenData);
    } catch (error) {
      this.clearSession();
      throw error instanceof Error
        ? error
        : new Error('The identity service could not be reached. Verify Keycloak is running.');
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.refreshTokenState();
    if (refreshToken) {
      const logoutEndpoint = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/logout`;
      const body = new URLSearchParams({
        client_id: environment.keycloak.clientId,
        refresh_token: refreshToken
      });

      try {
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
      } catch {
        // Ignore background logout errors
      }
    }

    this.clearSession();
  }

  hasAnyRole(requiredRoles: readonly string[]): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }
    return requiredRoles.some((role) => this.rolesState().includes(role));
  }

  dashboardPath(): string {
    const roles = this.rolesState();
    if (roles.includes('ROLE_ADMIN')) return '/admin-dashboard';
    if (roles.includes('ROLE_MANAGER')) return '/manager-dashboard';
    if (roles.includes('ROLE_DEVELOPER')) return '/developer-dashboard';
    return '/support-dashboard';
  }

  getAccessToken(): string | undefined {
    const token = this.tokenState();
    if (token && this.isTokenExpired()) {
      void this.refreshToken();
    }
    return this.tokenState();
  }

  private async initializeSession(): Promise<void> {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (storedToken && !this.isJwtExpired(storedToken)) {
        this.applyToken(storedToken, storedRefreshToken ?? undefined);
      } else if (storedRefreshToken && !this.isJwtExpired(storedRefreshToken)) {
        this.refreshTokenState.set(storedRefreshToken);
        await this.refreshToken();
      } else {
        this.clearSession();
      }
    } catch (error) {
      this.initializationErrorState.set(
        error instanceof Error ? error.message : 'Session initialization failed'
      );
      this.clearSession();
    } finally {
      this.readyState.set(true);
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = this.refreshTokenState();
    if (!refreshToken) {
      this.clearSession();
      return false;
    }

    const tokenEndpoint = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: environment.keycloak.clientId,
      refresh_token: refreshToken
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!response.ok) {
        this.clearSession();
        return false;
      }

      const tokenData: KeycloakTokenResponse = await response.json();
      this.handleTokenSuccess(tokenData);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private handleTokenSuccess(data: KeycloakTokenResponse): void {
    const expiresAt = Date.now() + (data.expires_in ?? 900) * 1000;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      this.refreshTokenState.set(data.refresh_token);
    }
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());

    this.applyToken(data.access_token, data.refresh_token);
  }

  private applyToken(accessToken: string, refreshToken?: string): void {
    const parsed = this.parseJwt(accessToken);
    this.tokenState.set(accessToken);
    if (refreshToken) {
      this.refreshTokenState.set(refreshToken);
    }
    this.profileState.set(parsed);
    this.rolesState.set(parsed?.realm_access?.roles ?? []);
    this.authenticatedState.set(true);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this.tokenState.set(undefined);
    this.refreshTokenState.set(undefined);
    this.profileState.set(undefined);
    this.rolesState.set([]);
    this.authenticatedState.set(false);
  }

  private isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) {
      return true;
    }
    const expiry = parseInt(expiryStr, 10);
    // Expired if within 30 seconds of expiration
    return Date.now() >= expiry - 30000;
  }

  private isJwtExpired(jwt: string): boolean {
    const parsed = this.parseJwt(jwt);
    if (!parsed?.exp) {
      return true;
    }
    return Date.now() >= parsed.exp * 1000 - 30000;
  }

  private parseJwt(token: string): ParsedToken | undefined {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        return undefined;
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return undefined;
    }
  }
}

