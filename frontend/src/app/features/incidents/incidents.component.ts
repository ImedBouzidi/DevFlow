import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

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

interface IncidentAnalysis {
  severity: { value: string; confidence: number | null };
  category: { value: string; confidence: number | null };
  resolution_time_hours: number;
}

interface CreatedIncident {
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  service: string;
  environment: string;
}

@Component({
  selector: 'app-incidents',
  imports: [DecimalPipe],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncidentsComponent {
  private readonly http = inject(HttpClient);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('All statuses');
  readonly severityFilter = signal('All severities');
  readonly selectedId = signal('INC-1042');
  readonly createOpen = signal(false);
  readonly analysis = signal<IncidentAnalysis | null>(null);
  readonly analysisLoading = signal(false);
  readonly createLoading = signal(false);
  readonly formError = signal('');
  readonly createdIncidents = signal<Incident[]>([]);

  readonly allIncidents = computed(() => [...this.createdIncidents(), ...this.incidents]);

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

    return this.allIncidents().filter((incident) => {
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
    () => this.allIncidents().find((incident) => incident.id === this.selectedId()) ?? null
  );

  openCreate(): void {
    this.analysis.set(null);
    this.formError.set('');
    this.createOpen.set(true);
  }

  async analyzeIncident(form: HTMLFormElement): Promise<void> {
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    this.analysisLoading.set(true);
    this.formError.set('');

    try {
      this.analysis.set(await firstValueFrom(this.http.post<IncidentAnalysis>(
        `${environment.aiAnalysisBaseUrl}/api/v1/predictions/incident`,
        {
          title: this.stringValue(data, 'title'),
          description: this.stringValue(data, 'description'),
          service: this.stringValue(data, 'service'),
          environment: this.stringValue(data, 'environment'),
          origin: this.stringValue(data, 'origin'),
          initial_context: {
            error_code: this.stringValue(data, 'errorCode') || null,
            http_status: this.numberValue(data, 'httpStatus'),
            cpu_percent: this.numberValue(data, 'cpuPercent'),
            memory_percent: this.numberValue(data, 'memoryPercent'),
            latency_ms: this.numberValue(data, 'latencyMs'),
            error_rate_percent: this.numberValue(data, 'errorRatePercent'),
            affected_users: this.numberValue(data, 'affectedUsers'),
            is_business_hours: data.get('isBusinessHours') === 'on',
            is_weekend: data.get('isWeekend') === 'on'
          }
        }
      )));
    } catch (error) {
      this.formError.set(this.errorMessage(error, 'AI analysis is unavailable. You can still create the incident.'));
    } finally {
      this.analysisLoading.set(false);
    }
  }

  async createIncident(form: HTMLFormElement): Promise<void> {
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    this.createLoading.set(true);
    this.formError.set('');

    try {
      const created: CreatedIncident = await firstValueFrom(this.http.post<CreatedIncident>(
        `${environment.apiBaseUrl}/api/incidents`,
        {
          title: this.stringValue(data, 'title'),
          description: this.stringValue(data, 'description'),
          service: this.stringValue(data, 'service'),
          environment: this.stringValue(data, 'environment'),
          origin: this.stringValue(data, 'origin'),
          severity: this.stringValue(data, 'severity'),
          category: this.stringValue(data, 'category'),
          initialContext: {
            errorCode: this.stringValue(data, 'errorCode') || null,
            httpStatus: this.numberValue(data, 'httpStatus'),
            cpuPercent: this.numberValue(data, 'cpuPercent'),
            memoryPercent: this.numberValue(data, 'memoryPercent'),
            latencyMs: this.numberValue(data, 'latencyMs'),
            errorRatePercent: this.numberValue(data, 'errorRatePercent'),
            affectedUsers: this.numberValue(data, 'affectedUsers'),
            isBusinessHours: data.get('isBusinessHours') === 'on',
            isWeekend: data.get('isWeekend') === 'on'
          }
        }
      ));

      const incident = this.toIncident(created);
      this.createdIncidents.update((items) => [incident, ...items]);
      this.selectedId.set(incident.id);
      this.createOpen.set(false);
    } catch (error) {
      this.formError.set(this.errorMessage(error, 'Incident could not be created. Please try again.'));
    } finally {
      this.createLoading.set(false);
    }
  }

  private stringValue(data: FormData, name: string): string {
    return String(data.get(name) ?? '').trim();
  }

  private numberValue(data: FormData, name: string): number | null {
    const value = String(data.get(name) ?? '').trim();
    return value === '' ? null : Number(value);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Could not reach the service. Check that the API is running and try again.';
    }
    return fallback;
  }

  private toIncident(created: CreatedIncident): Incident {
    const now = new Date();
    return {
      id: created.incidentId,
      title: created.title,
      description: created.description,
      service: created.service,
      environment: created.environment,
      severity: this.displaySeverity(created.severity),
      status: 'Open',
      reporter: 'Support',
      assignee: 'Unassigned',
      created: now.toLocaleString(),
      age: 'Just now',
      confidence: Math.round((this.analysis()?.severity.confidence ?? 0) * 100),
      category: created.category,
      aiSummary: this.analysis()
        ? `Estimated resolution time: ${this.analysis()!.resolution_time_hours.toFixed(1)} hours.`
        : 'No AI analysis was run for this incident.',
      similar: 0
    };
  }

  displaySeverity(value: string): Severity {
    return `${value[0]}${value.slice(1).toLowerCase()}` as Severity;
  }

  applyAnalysis(severity: HTMLSelectElement, category: HTMLSelectElement): void {
    const result = this.analysis();
    if (!result) return;
    severity.value = result.severity.value;
    category.value = result.category.value;
  }

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
