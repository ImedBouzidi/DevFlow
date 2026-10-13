import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  CreateIncidentRequest,
  IncidentAnalysis,
  IncidentRecord,
  IncidentsApiService
} from '../../core/api/incidents-api.service';
import { environment } from '../../../environments/environment';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type IncidentStatus = 'Open' | 'In Progress' | 'Closed';

interface Incident {
  id: string;
  title: string;
  description: string;
  service: string;
  environment: string;
  severity: Severity;
  status: IncidentStatus;
  created: string;
  age: string;
  analysis: IncidentAnalysis | null;
  category: string;
}

@Component({
  selector: 'app-incidents',
  imports: [DecimalPipe],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncidentsComponent {
  private readonly incidentsApi = inject(IncidentsApiService);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('All statuses');
  readonly severityFilter = signal('All severities');
  readonly selectedId = signal('');
  readonly createOpen = signal(false);
  readonly analysis = signal<IncidentAnalysis | null>(null);
  readonly analysisLoading = signal(false);
  readonly createLoading = signal(false);
  readonly formError = signal('');
  readonly incidents = signal<Incident[]>([]);
  readonly incidentsLoading = signal(false);
  readonly incidentsError = signal('');

  constructor() {
    void this.loadIncidents();
  }

  readonly filteredIncidents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const severity = this.severityFilter();

    return this.incidents().filter((incident) => {
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
    () => this.incidents().find((incident) => incident.id === this.selectedId()) ?? null
  );

  async loadIncidents(): Promise<void> {
    this.incidentsLoading.set(true);
    this.incidentsError.set('');
    try {
      const page = await firstValueFrom(this.incidentsApi.list());
      const incidents = page.content.map((record) => this.toIncident(record, null));
      this.incidents.set(incidents);
      if (!incidents.some((incident) => incident.id === this.selectedId())) {
        this.selectedId.set(incidents[0]?.id ?? '');
      }
    } catch (error) {
      this.incidentsError.set(this.errorMessage(error, 'Could not load incidents.'));
    } finally {
      this.incidentsLoading.set(false);
    }
  }

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
      this.analysis.set(await firstValueFrom(this.incidentsApi.analyze(this.toRequest(data))));
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
    const endpoint = `${environment.apiBaseUrl}/api/incidents`;
    const request = this.toRequest(data);

    if (!environment.production) {
      console.debug('[Incidents] Creating incident', { endpoint });
    }

    try {
      let analysis = this.analysis();
      if (!analysis) {
        try {
          analysis = await firstValueFrom(this.incidentsApi.analyze(request));
        } catch (error) {
          if (!environment.production) {
            console.warn('[Incidents] AI advisory unavailable; continuing incident creation', error);
          }
        }
      }

      const created = await firstValueFrom(this.incidentsApi.create(request));

      const incident = this.toIncident(created, analysis);
      this.incidents.update((items) => [incident, ...items.filter((item) => item.id !== incident.id)]);
      this.selectedId.set(incident.id);
      this.createOpen.set(false);
      if (!environment.production) {
        console.debug('[Incidents] Incident created', { incidentId: incident.id });
      }
    } catch (error) {
      if (!environment.production) {
        console.error('[Incidents] Incident creation failed', {
          status: error instanceof HttpErrorResponse ? error.status : 'unknown',
          statusText: error instanceof HttpErrorResponse ? error.statusText : undefined,
          message: error instanceof HttpErrorResponse || error instanceof Error
            ? error.message
            : 'Unknown error',
          url: error instanceof HttpErrorResponse ? error.url : endpoint
        });
      }
      this.formError.set(this.errorMessage(error, 'Incident could not be created. Please try again.'));
    } finally {
      this.createLoading.set(false);
    }
  }

  private toRequest(data: FormData): CreateIncidentRequest {
    return {
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
    };
  }

  private stringValue(data: FormData, name: string): string {
    return String(data.get(name) ?? '').trim();
  }

  private numberValue(data: FormData, name: string): number | null {
    const value = String(data.get(name) ?? '').trim();
    return value === '' ? null : Number(value);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'Your account cannot create incidents. Sign in with a developer or admin account.';
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Could not reach the service. Check that the API is running and try again.';
    }
    return fallback;
  }

  private toIncident(created: IncidentRecord, analysis: IncidentAnalysis | null): Incident {
    const createdAt = new Date(created.createdAt);
    return {
      id: created.incidentId,
      title: created.title,
      description: created.description,
      service: created.service,
      environment: this.displayEnum(created.environment),
      severity: this.displaySeverity(created.severity),
      status: this.displayStatus(created.status),
      created: createdAt.toLocaleString(),
      age: this.relativeAge(createdAt),
      analysis,
      category: this.displayEnum(created.category)
    };
  }

  private displayEnum(value: string): string {
    return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private displayStatus(value: string): IncidentStatus {
    if (value === 'IN_PROGRESS') return 'In Progress';
    if (value === 'CLOSED') return 'Closed';
    return 'Open';
  }

  private relativeAge(date: Date): string {
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
