import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(undefined);

    const emailOrUsername = this.loginForm.controls.email.value;
    const password = this.loginForm.controls.password.value;

    try {
      await this.authService.loginWithCredentials(emailOrUsername, password);

      const targetDefault = this.authService.dashboardPath();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || targetDefault;

      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Sign-in failed. Please check your email/password or verify that Keycloak is running.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}

