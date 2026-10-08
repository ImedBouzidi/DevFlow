import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

interface AdminMetric {
    label: string;
    value: string;
    detail: string;
    status: 'healthy' | 'warning' | 'info';
    icon: string;
}

interface ServiceStatus {
    name: string;
    port: number;
    status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    uptime: string;
    latency: string;
}

@Component({
    selector: 'app-admin-dashboard',
    imports: [RouterLink],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
    readonly authService = inject(AuthService);

    readonly adminMetrics: readonly AdminMetric[] = [
        { label: 'Registered Users', value: '42', detail: '8 new this week', status: 'healthy', icon: 'users' },
        { label: 'Active Services', value: '5 / 5', detail: '100% operational', status: 'healthy', icon: 'services' },
        { label: 'Keycloak Realm', value: 'devflow', detail: 'OIDC S256 Active', status: 'info', icon: 'security' },
        { label: 'Platform Uptime', value: '99.98%', detail: 'Last 30 days', status: 'healthy', icon: 'uptime' }
    ];

    readonly services: readonly ServiceStatus[] = [
        { name: 'Discovery Server (Eureka)', port: 8761, status: 'ONLINE', uptime: '14d 6h', latency: '4ms' },
        { name: 'API Gateway', port: 9090, status: 'ONLINE', uptime: '14d 6h', latency: '12ms' },
        { name: 'Auth Register Service', port: 8082, status: 'ONLINE', uptime: '3d 12h', latency: '18ms' },
        { name: 'Incident Service', port: 8083, status: 'ONLINE', uptime: '3d 12h', latency: '15ms' },
        { name: 'Keycloak IAM Server', port: 9091, status: 'ONLINE', uptime: '14d 6h', latency: '22ms' }
    ];

}
