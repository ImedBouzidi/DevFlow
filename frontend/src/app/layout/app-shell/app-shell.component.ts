import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly mobileMenuOpen = signal(false);
  readonly profileMenuOpen = signal(false);

  readonly primaryRole = computed(() => {
    const roles = this.authService.roles();
    const role = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEVELOPER', 'ROLE_SUPPORT']
      .find((candidate) => roles.includes(candidate)) || 'ROLE_SUPPORT';
    return role.replace('ROLE_', '').toLowerCase();
  });

  @HostListener('document:keydown.escape')
  closeMenus(): void {
    this.mobileMenuOpen.set(false);
    this.profileMenuOpen.set(false);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  async signOut(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
