import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
    ManagedUser,
    USER_ROLES,
    UserManagementApiService,
    UserRole
} from '../../core/api/user-management-api.service';

@Component({
    selector: 'app-user-management',
    imports: [ReactiveFormsModule],
    templateUrl: './user-management.component.html',
    styleUrl: './user-management.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly userApi = inject(UserManagementApiService);
    private readonly router = inject(Router);

    readonly userRoles = USER_ROLES.map((value) => ({
        value,
        label: value.replace('ROLE_', '').toLowerCase()
    }));
    readonly users = signal<ManagedUser[]>([]);
    readonly loadingUsers = signal(false);
    readonly savingUser = signal(false);
    readonly editorOpen = signal(false);
    readonly editingUser = signal<ManagedUser | null>(null);
    readonly selectedRoles = signal<UserRole[]>(['ROLE_DEVELOPER']);
    readonly searchQuery = signal('');
    readonly errorMessage = signal('');
    readonly successMessage = signal('');
    readonly showPassword = signal(false);
    readonly showConfirmPassword = signal(false);
    readonly activeUsers = computed(() => this.users().filter((user) => user.enabled).length);
    readonly filteredUsers = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        if (!query) return this.users();
        return this.users().filter((user) =>
            [user.username, user.firstName, user.lastName, user.email, ...user.roles]
                .some((value) => value.toLowerCase().includes(query))
        );
    });
    readonly userForm = this.formBuilder.nonNullable.group({
        username: ['', [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
            Validators.pattern(/^[A-Za-z0-9._-]+$/)
        ]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
        firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
        lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
        password: [''],
        confirmPassword: ['']
    });

    constructor() {
        this.loadUsers();
    }

    loadUsers(): void {
        this.loadingUsers.set(true);
        this.userApi.list().pipe(finalize(() => this.loadingUsers.set(false))).subscribe({
            next: (users) => this.users.set(users),
            error: (error: HttpErrorResponse) => this.errorMessage.set(this.readError(error))
        });
    }

    openCreateForm(): void {
        this.editingUser.set(null);
        this.selectedRoles.set(['ROLE_DEVELOPER']);
        this.userForm.reset({
            username: '', email: '', firstName: '', lastName: '', password: '', confirmPassword: ''
        });
        this.showPassword.set(false);
        this.showConfirmPassword.set(false);
        this.userForm.controls.username.enable();
        this.userForm.controls.password.setValidators([
            Validators.required,
            Validators.minLength(12),
            Validators.maxLength(72),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
        ]);
        this.userForm.controls.password.updateValueAndValidity();
        this.userForm.controls.confirmPassword.setValidators([Validators.required]);
        this.userForm.controls.confirmPassword.updateValueAndValidity();
        this.clearFeedback();
        this.editorOpen.set(true);
    }

    openEditForm(user: ManagedUser): void {
        this.editingUser.set(user);
        this.selectedRoles.set([...user.roles]);
        this.userForm.reset({
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            password: '',
            confirmPassword: ''
        });
        this.userForm.controls.username.disable();
        this.userForm.controls.password.clearValidators();
        this.userForm.controls.password.updateValueAndValidity();
        this.userForm.controls.confirmPassword.clearValidators();
        this.userForm.controls.confirmPassword.updateValueAndValidity();
        this.clearFeedback();
        this.editorOpen.set(true);
    }

    closeEditor(): void {
        this.editorOpen.set(false);
        this.userForm.controls.username.enable();
    }

    toggleRole(role: UserRole, checked: boolean): void {
        this.selectedRoles.update((selected) => {
            const next = new Set(selected);
            if (checked) next.add(role);
            else next.delete(role);
            return [...next];
        });
    }

    selectRole(role: UserRole): void {
        this.selectedRoles.set([role]);
    }

    togglePasswordVisibility(): void {
        this.showPassword.update((visible) => !visible);
    }

    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword.update((visible) => !visible);
    }

    passwordsDoNotMatch(): boolean {
        return this.userForm.controls.confirmPassword.touched &&
            this.userForm.controls.password.value !== this.userForm.controls.confirmPassword.value;
    }

    saveUser(): void {
        const passwordMismatch = !this.editingUser() &&
            this.userForm.controls.password.value !== this.userForm.controls.confirmPassword.value;
        if (this.userForm.invalid || this.selectedRoles().length === 0 || passwordMismatch) {
            this.userForm.markAllAsTouched();
            return;
        }
        const value = this.userForm.getRawValue();
        const editing = this.editingUser();
        this.clearFeedback();
        this.savingUser.set(true);

        const request = editing
            ? this.userApi.update(editing.id, {
                email: value.email.trim(),
                firstName: value.firstName.trim(),
                lastName: value.lastName.trim(),
                roles: this.selectedRoles(),
                enabled: editing.enabled
            })
            : this.userApi.create({
                username: value.username.trim(),
                email: value.email.trim(),
                firstName: value.firstName.trim(),
                lastName: value.lastName.trim(),
                password: value.password,
                roles: this.selectedRoles()
            });

        request.pipe(finalize(() => this.savingUser.set(false))).subscribe({
            next: () => {
                this.closeEditor();
                this.successMessage.set(editing
                    ? 'User changes saved.'
                    : 'User created in Keycloak and saved to the DevFlow database.');
                if (editing) {
                    this.loadUsers();
                } else {
                    this.loadUsersAndOpenDirectory();
                }
            },
            error: (error: HttpErrorResponse) => this.errorMessage.set(this.readError(error))
        });
    }

    toggleEnabled(user: ManagedUser): void {
        this.userApi.update(user.id, {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            enabled: !user.enabled
        }).subscribe({
            next: () => this.loadUsers(),
            error: (error: HttpErrorResponse) => this.errorMessage.set(this.readError(error))
        });
    }

    removeUser(user: ManagedUser): void {
        if (!window.confirm(`Remove ${user.username} from DevFlow and Keycloak?`)) return;
        this.userApi.remove(user.id).subscribe({
            next: () => {
                this.successMessage.set(`${user.username} removed.`);
                this.loadUsers();
            },
            error: (error: HttpErrorResponse) => this.errorMessage.set(this.readError(error))
        });
    }

    private clearFeedback(): void {
        this.errorMessage.set('');
        this.successMessage.set('');
    }

    private loadUsersAndOpenDirectory(): void {
        this.loadingUsers.set(true);
        this.userApi.list().pipe(finalize(() => this.loadingUsers.set(false))).subscribe({
            next: (users) => {
                this.users.set(users);
                void this.router.navigateByUrl('/user-management#accounts');
            },
            error: (error: HttpErrorResponse) => this.errorMessage.set(this.readError(error))
        });
    }

    private readError(error: HttpErrorResponse): string {
        const response = error.error as {
            detail?: string;
            title?: string;
            message?: string;
            error?: string;
            errors?: Record<string, string>;
        } | null;
        const details = response?.errors
            ? Object.entries(response.errors).map(([field, message]) => `${field}: ${message}`).join('; ')
            : '';
        return [response?.detail || response?.message || response?.error || response?.title, details]
            .filter(Boolean)
            .join(' ') ||
            (error.status === 0
                ? 'Could not reach the API gateway. Check that the services are running and try again.'
                : `User management request failed (${error.status}). Try again.`);
    }
}