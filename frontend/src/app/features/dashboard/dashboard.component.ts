import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

interface MetricCard {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  icon: 'incidents' | 'open' | 'critical' | 'resolved' | 'time' | 'mttr';
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly authService = inject(AuthService);

  readonly metrics: readonly MetricCard[] = [
    { label: 'Total incidents', value: '128', delta: '12% vs last 7 days', trend: 'up', icon: 'incidents', tone: 'blue' },
    { label: 'Open incidents', value: '23', delta: '8% vs last 7 days', trend: 'down', icon: 'open', tone: 'blue' },
    { label: 'Critical', value: '4', delta: '20% vs last 7 days', trend: 'up', icon: 'critical', tone: 'red' },
    { label: 'Resolved today', value: '9', delta: '28% vs yesterday', trend: 'up', icon: 'resolved', tone: 'green' },
    { label: 'Avg resolution time', value: '2.4h', delta: '15% faster', trend: 'neutral', icon: 'time', tone: 'teal' },
    { label: 'MTTR', value: '3.7h', delta: '10% improvement', trend: 'down', icon: 'mttr', tone: 'purple' }
  ];

  readonly severity = [
    { label: 'Critical', count: 4, width: 8, color: '#e5484d' },
    { label: 'High', count: 19, width: 25, color: '#f28a30' },
    { label: 'Medium', count: 52, width: 67, color: '#377de5' },
    { label: 'Low', count: 53, width: 69, color: '#36a69b' }
  ];

  readonly recentIncidents = [
    { id: 'INC-1248', title: 'Checkout failing with 500 errors', service: 'Checkout Service', severity: 'Critical', status: 'Open', age: '1h 12m' },
    { id: 'INC-1247', title: 'Payment gateway timeout', service: 'Payment Service', severity: 'Critical', status: 'Open', age: '2h 34m' },
    { id: 'INC-1245', title: 'Auth service high error rate', service: 'Auth Service', severity: 'High', status: 'Investigating', age: '3h 45m' },
    { id: 'INC-1243', title: 'Inventory sync failing', service: 'Inventory Service', severity: 'High', status: 'Investigating', age: '5h 20m' }
  ];
}
