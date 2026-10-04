import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
  readonly mobileMenuOpen = signal(false);
  readonly profileMenuOpen = signal(false);

  readonly primaryRole = computed(() => {
    const role = this.authService.roles()[0] || 'ROLE_SUPPORT';
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
}
