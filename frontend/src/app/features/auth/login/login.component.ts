import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(120)]]
  });

  async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(undefined);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    try {
      await this.authService.login(returnUrl, this.loginForm.controls.username.value);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Sign-in is currently unavailable. Check that Keycloak is running and try again.'
      );
      this.loading.set(false);
    }
  }
}
