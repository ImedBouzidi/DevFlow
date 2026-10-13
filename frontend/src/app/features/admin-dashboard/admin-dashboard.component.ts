import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';
import { ManagedUser, UserManagementApiService } from '../../core/api/user-management-api.service';

@Component({
    selector: 'app-admin-dashboard',
    imports: [DatePipe, RouterLink],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
    readonly authService = inject(AuthService);
    private readonly incidentApi = inject(IncidentsApiService);
    private readonly userApi = inject(UserManagementApiService);
    readonly users = signal<ManagedUser[]>([]);
    readonly incidents = signal<IncidentRecord[]>([]);
    readonly loading = signal(true);
    readonly loadError = signal('');
    readonly metrics = computed(() => [
        { label: 'Registered users', value: this.users().length, detail: 'Accounts returned by user management' },
        { label: 'Enabled users', value: this.users().filter((user) => user.enabled).length, detail: 'Enabled accounts' },
        { label: 'Incident records', value: this.incidents().length, detail: 'Persisted incident records' },
        { label: 'Open incidents', value: this.incidents().filter((incident) => incident.status !== 'CLOSED').length, detail: 'Not closed' }
    ]);

    constructor() {
        void this.loadData();
    }

    async loadData(): Promise<void> {
        this.loading.set(true);
        this.loadError.set('');
        try {
            const [users, incidentPage] = await Promise.all([
                firstValueFrom(this.userApi.list()),
                firstValueFrom(this.incidentApi.list())
            ]);
            this.users.set(users);
            this.incidents.set(incidentPage.content);
        } catch {
            this.loadError.set('Account or incident data could not be loaded.');
        } finally {
            this.loading.set(false);
        }
    }
}
