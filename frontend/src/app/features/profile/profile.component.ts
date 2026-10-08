import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthApiService } from '../../core/api/auth-api.service';
import { UserProfile } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authService = inject(AuthService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly savingProfile = signal(false);
  readonly changingPassword = signal(false);
  readonly profileError = signal('');
  readonly profileSuccess = signal('');
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');

  readonly profileForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]]
  });

  readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(72),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    ]],
    confirmPassword: ['', Validators.required]
  });

  constructor() {
    this.loadProfile();
  }

  passwordsDoNotMatch(): boolean {
    return this.passwordForm.controls.confirmPassword.touched &&
      this.passwordForm.controls.newPassword.value !== this.passwordForm.controls.confirmPassword.value;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileError.set('');
    this.profileSuccess.set('');
    this.savingProfile.set(true);
    this.authApi.updateCurrentUser(this.profileForm.getRawValue())
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.profileForm.patchValue({
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName
          });
          this.authService.updateProfile(profile.firstName, profile.lastName, profile.email);
          this.profileSuccess.set('Your profile was updated.');
        },
        error: (error: HttpErrorResponse) => this.profileError.set(this.readError(error))
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.passwordsDoNotMatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.changingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.authApi.changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => this.changingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.passwordSuccess.set('Your password was changed.');
        },
        error: (error: HttpErrorResponse) => this.passwordError.set(this.readError(error))
      });
  }

  private loadProfile(): void {
    this.authApi.currentUser().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.patchValue({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName
        });
      },
      error: (error: HttpErrorResponse) => this.profileError.set(this.readError(error))
    });
  }

  private readError(error: HttpErrorResponse): string {
    const response = error.error as { detail?: string; title?: string; message?: string } | null;
    return response?.detail || response?.message || response?.title ||
      (error.status === 0
        ? 'Could not reach the API gateway. Check that the services are running and try again.'
        : `Request failed (${error.status}). Please try again.`);
  }
}
