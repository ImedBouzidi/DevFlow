import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApiService } from '../../../core/api/auth-api.service';
import { ApiProblem, RegisterRequest } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value as string | undefined;
  const confirmation = control.get('confirmPassword')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly registeredUsername = signal('');
  readonly passwordScore = signal(0);

  readonly passwordStrength = computed(() => {
    const labels = ['Too weak', 'Weak', 'Good', 'Strong'];
    return labels[this.passwordScore()] || labels[0];
  });

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-z0-9._-]+$/)
        ]
      ],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(72),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );

  constructor() {
    this.registerForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((password) => this.passwordScore.set(this.scorePassword(password)));
  }

  register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { confirmPassword: _confirmation, ...request } = this.registerForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(undefined);

    this.authApi
      .register(request as RegisterRequest)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          this.registeredUsername.set(user.username);
          this.success.set(true);
        },
        error: (error: HttpErrorResponse) => this.errorMessage.set(this.readProblem(error))
      });
  }

  async continueToSignIn(): Promise<void> {
    this.loading.set(true);
    try {
      await this.authService.login('/dashboard', this.registeredUsername());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Secure sign-in is currently unavailable.'
      );
      this.loading.set(false);
    }
  }

  hasRule(rule: 'length' | 'lower' | 'upper' | 'number' | 'symbol'): boolean {
    const value = this.registerForm.controls.password.value;
    const checks: Record<typeof rule, boolean> = {
      length: value.length >= 12,
      lower: /[a-z]/.test(value),
      upper: /[A-Z]/.test(value),
      number: /\d/.test(value),
      symbol: /[^A-Za-z0-9]/.test(value)
    };
    return checks[rule];
  }

  private scorePassword(password: string): number {
    let score = 0;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  private readProblem(error: HttpErrorResponse): string {
    const problem = error.error as ApiProblem | undefined;
    const fieldError = problem?.errors ? Object.values(problem.errors)[0] : undefined;
    return fieldError || problem?.detail || 'Registration could not be completed. Please try again.';
  }
}
