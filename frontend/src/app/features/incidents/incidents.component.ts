import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type IncidentStatus = 'Open' | 'In Progress' | 'Investigating' | 'Resolved' | 'Blocked';

interface Incident {
  id: string;
  title: string;
  description: string;
  service: string;
  environment: string;
  severity: Severity;
  status: IncidentStatus;
  reporter: string;
  assignee: string;
  created: string;
  age: string;
  confidence: number;
  category: string;
  aiSummary: string;
  similar: number;
}

@Component({
  selector: 'app-incidents',
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncidentsComponent {
  readonly searchTerm = signal('');
  readonly statusFilter = signal('All statuses');
  readonly severityFilter = signal('All severities');
  readonly selectedId = signal('INC-1042');
  readonly createNotice = signal(false);

  readonly incidents: readonly Incident[] = [
    {
      id: 'INC-1042',
      title: 'Payment service failing with 500 errors',
      description: 'The payment processing service is returning 500 errors for POST /charges requests. Impacting checkout flow for all customers using credit cards.',
      service: 'Payments',
      environment: 'production',
      severity: 'Critical',
      status: 'In Progress',
      reporter: 'Jordan Lee',
      assignee: 'Maya Chen',
      created: 'May 24, 2025 · 10:21 AM',
      age: '10m ago',
      confidence: 92,
      category: 'Payment Processing',
      aiSummary: 'Error rate began rising immediately after the payment gateway deployment. Downstream authorization latency and the new retry policy are the strongest correlated signals.',
      similar: 3
    },
    {
      id: 'INC-1041',
      title: 'Checkout latency spiking above 2 seconds',
      description: 'Checkout p95 latency is above the two-second objective during peak traffic windows.',
      service: 'Checkout',
      environment: 'production',
      severity: 'High',
      status: 'Open',
      reporter: 'Monitoring',
      assignee: 'Unassigned',
      created: 'May 24, 2025 · 09:15 AM',
      age: '1h 16m ago',
      confidence: 78,
      category: 'Performance',
      aiSummary: 'Latency correlates with a connection-pool saturation pattern seen in the inventory dependency.',
      similar: 5
    },
    {
      id: 'INC-1040',
      title: 'Database connection timeout errors',
      description: 'Order API workers are intermittently timing out while establishing database connections.',
      service: 'Database',
      environment: 'production',
      severity: 'Critical',
      status: 'Investigating',
      reporter: 'Samir Patel',
      assignee: 'Priya Shah',
      created: 'May 23, 2025 · 11:47 PM',
      age: '11h 34m ago',
      confidence: 89,
      category: 'Availability',
      aiSummary: 'Connection utilization crossed the threshold four minutes before the first timeout.',
      similar: 8
    },
    {
      id: 'INC-1039',
      title: 'Auth service intermittent failures',
      description: 'A small percentage of token refresh requests are returning an invalid session response.',
      service: 'Authentication',
      environment: 'production',
      severity: 'Medium',
      status: 'Resolved',
      reporter: 'Monitoring',
      assignee: 'Taylor Kim',
      created: 'May 23, 2025 · 04:32 PM',
      age: '18h 49m ago',
      confidence: 65,
      category: 'Authentication',
      aiSummary: 'A stale signing-key cache caused the failures. The cache was refreshed and error rates recovered.',
      similar: 2
    },
    {
      id: 'INC-1038',
      title: 'High memory usage on API nodes',
      description: 'Memory usage exceeded 85 percent on two API gateway nodes.',
      service: 'API Gateway',
      environment: 'staging',
      severity: 'High',
      status: 'Open',
      reporter: 'Monitoring',
      assignee: 'Unassigned',
      created: 'May 23, 2025 · 02:19 PM',
      age: '23h 02m ago',
      confidence: 71,
      category: 'Resource',
      aiSummary: 'Heap snapshots point to an unbounded response-buffer cache introduced this week.',
      similar: 4
    },
    {
      id: 'INC-1037',
      title: 'Notification delivery delayed',
      description: 'Email notifications are queued but delivered 18 to 24 minutes late.',
      service: 'Notification',
      environment: 'production',
      severity: 'Low',
      status: 'Blocked',
      reporter: 'Support',
      assignee: 'Alex Chen',
      created: 'May 22, 2025 · 08:44 AM',
      age: '1d 7h ago',
      confidence: 58,
      category: 'Delivery',
      aiSummary: 'The provider reports a regional backlog; no corresponding application errors were detected.',
      similar: 1
    }
  ];

  readonly filteredIncidents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const severity = this.severityFilter();

    return this.incidents.filter((incident) => {
      const matchesQuery =
        !query ||
        incident.id.toLowerCase().includes(query) ||
        incident.title.toLowerCase().includes(query) ||
        incident.service.toLowerCase().includes(query);
      const matchesStatus = status === 'All statuses' || incident.status === status;
      const matchesSeverity = severity === 'All severities' || incident.severity === severity;
      return matchesQuery && matchesStatus && matchesSeverity;
    });
  });

  readonly selectedIncident = computed(
    () => this.incidents.find((incident) => incident.id === this.selectedId()) ?? null
  );

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  updateSeverity(event: Event): void {
    this.severityFilter.set((event.target as HTMLSelectElement).value);
  }

  selectIncident(id: string): void {
    this.selectedId.set(id);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All statuses');
    this.severityFilter.set('All severities');
  }

  statusClass(status: IncidentStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  severityClass(severity: Severity): string {
    return severity.toLowerCase();
  }
}
