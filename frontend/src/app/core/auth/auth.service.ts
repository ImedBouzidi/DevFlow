import { computed, inject, Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

import { environment } from '../../../environments/environment';

interface RealmAccess {
  roles?: string[];
}

interface ParsedToken {
  preferred_username?: string;
  name?: string;
  given_name?: string;
  email?: string;
  realm_access?: RealmAccess;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId
  });

  private readonly authenticatedState = signal(false);
  private readonly readyState = signal(false);
  private readonly tokenState = signal<string | undefined>(undefined);
  private readonly profileState = signal<ParsedToken | undefined>(undefined);
  private readonly rolesState = signal<readonly string[]>([]);
  private readonly initializationErrorState = signal<string | undefined>(undefined);
  private initialization?: Promise<void>;

  readonly isAuthenticated = this.authenticatedState.asReadonly();
  readonly isReady = this.readyState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly roles = this.rolesState.asReadonly();
  readonly initializationError = this.initializationErrorState.asReadonly();

  readonly displayName = computed(() => {
    const profile = this.profileState();
    return profile?.name || profile?.preferred_username || 'DevFlow user';
  });

  readonly email = computed(() => this.profileState()?.email || '');

  readonly initials = computed(() => {
    const profile = this.profileState();
    const source = profile?.given_name || profile?.preferred_username || 'DF';
    return source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  initialize(): Promise<void> {
    if (this.initialization) {
      return this.initialization;
    }

    this.initialization = this.initializeKeycloak();
    return this.initialization;
  }

  async login(returnUrl = '/dashboard', loginHint?: string): Promise<void> {
    await this.initialize();
    if (!this.readyState()) {
      return;
    }
    if (this.initializationErrorState()) {
      throw new Error(this.initializationErrorState());
    }

    await this.keycloak.login({
      redirectUri: this.redirectUri(returnUrl),
      loginHint: loginHint?.trim() || undefined
    });
  }

  async logout(): Promise<void> {
    await this.initialize();
    await this.keycloak.logout({ redirectUri: `${window.location.origin}/login` });
  }

  hasAnyRole(requiredRoles: readonly string[]): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }
    return requiredRoles.some((role) => this.rolesState().includes(role));
  }

  getAccessToken(): string | undefined {
    if (this.keycloak.authenticated && this.keycloak.isTokenExpired(30)) {
      void this.keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            this.updateAuthenticationState();
          }
        })
        .catch(() => this.updateAuthenticationState(false));
    }
    return this.tokenState() ?? this.keycloak.token;
  }

  private async initializeKeycloak(): Promise<void> {
    try {
      this.keycloak.onAuthRefreshSuccess = () => this.updateAuthenticationState();
      this.keycloak.onTokenExpired = () => void this.login();
      await this.keycloak.init({
        onLoad: 'check-sso',
        checkLoginIframe: true,
        checkLoginIframeInterval: 30,
        flow: 'standard',
        pkceMethod: 'S256',
        redirectUri: `${window.location.origin}/`
      });
      this.updateAuthenticationState();
    } catch (error) {
      this.initializationErrorState.set(
        error instanceof Error
          ? error.message
          : 'The identity service could not be reached. Start the local infrastructure and try again.'
      );
      this.updateAuthenticationState(false);
    } finally {
      this.readyState.set(true);
    }
  }

  private updateAuthenticationState(authenticated = this.keycloak.authenticated): void {
    this.authenticatedState.set(authenticated);
    this.tokenState.set(authenticated ? this.keycloak.token : undefined);
    const parsedToken = authenticated ? (this.keycloak.tokenParsed as ParsedToken | undefined) : undefined;
    this.profileState.set(parsedToken);
    this.rolesState.set(parsedToken?.realm_access?.roles ?? []);
  }

  private redirectUri(returnUrl: string): string {
    const normalizedPath = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
    return `${window.location.origin}${normalizedPath}`;
  }
}
