import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';
import { DeveloperDirectoryEntry, UserManagementApiService } from '../../core/api/user-management-api.service';

@Component({
  selector: 'app-manager-dashboard',
  imports: [RouterLink],
  template: `
    <div class="dashboard-page role-dashboard">
      <header class="page-heading">
        <div><span class="eyebrow">Team operations</span><h1>Manager overview</h1>
          <p>Coordinate incident response, balance workload, and keep the team moving.</p></div>
        <a class="button" routerLink="/incidents">Review incident queue</a>
      </header>
      <section class="metrics-grid" aria-label="Team operations">
        @for (metric of metrics(); track metric.label) {
          <article class="metric-card page-card"><span class="metric-card__label">{{ metric.label }}</span><strong class="metric-card__value">{{ metric.value }}</strong><span class="metric-card__delta">{{ metric.detail }}</span></article>
        }
      </section>
      @if (loadError()) { <p role="alert">{{ loadError() }} <button type="button" (click)="loadIncidents()">Retry</button></p> }
      <section class="role-workspace page-card">
        <div class="card-heading"><div><h2>Response coordination</h2><p>Keep high-impact work visible and correctly assigned.</p></div></div>
        <div class="role-workspace__grid">
          <article><span class="role-workspace__index">01</span><h3>Review incoming incidents</h3><p>Check severity, affected service, and current status before assigning work.</p><a routerLink="/incidents">Open incidents <span aria-hidden="true">→</span></a></article>
          <article><span class="role-workspace__index">02</span><h3>Balance team workload</h3><p>Use the incident queue to spot unassigned items and concentrated ownership.</p><a routerLink="/incidents">View team queue <span aria-hidden="true">→</span></a></article>
          <article><span class="role-workspace__index">03</span><h3>Track resolution progress</h3><p>Follow active incidents through investigation, mitigation, and resolution.</p><a routerLink="/incidents">Track response <span aria-hidden="true">→</span></a></article>
        </div>
      </section>
      <section class="assignment-queue page-card" aria-labelledby="assignment-title">
        <div class="card-heading"><div><h2 id="assignment-title">Incident queue</h2><p>Select an incident to review its details and assign an owner.</p></div></div>
        @if (assignmentError()) { <p class="assignment-error" role="alert">{{ assignmentError() }}</p> }
        @if (developersError()) { <p class="assignment-error" role="alert">{{ developersError() }}</p> }
        @if (queueIncidents().length) {
          <div class="assignment-table-wrap">
            <table class="assignment-table">
              <thead><tr><th>Incident</th><th>Severity</th><th>Assignment</th><th></th></tr></thead>
              <tbody>
                @for (incident of queueIncidents(); track incident.incidentId) {
                  <tr>
                    <td><strong>{{ incident.incidentId }}</strong><span>{{ incident.title }}</span></td>
                    <td>{{ incident.severity }}</td>
                    <td>@if (incident.assignedDeveloper) { <span class="assignment-state assignment-state--assigned">Assigned · {{ incident.assignedDeveloper }}</span> } @else { <span class="assignment-state assignment-state--unassigned">Not assigned</span> }</td>
                    <td><button class="button button--secondary" type="button" [attr.aria-pressed]="selectedIncidentId() === incident.incidentId" (click)="selectIncident(incident.incidentId)">{{ selectedIncidentId() === incident.incidentId ? 'Viewing' : 'View details' }}</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="assignment-empty">No incidents to review.</p>
        }
        @if (selectedIncident(); as incident) {
          <article class="incident-details" aria-labelledby="selected-incident-title">
            <header><div><span class="incident-details__id">{{ incident.incidentId }}</span><h3 id="selected-incident-title">{{ incident.title }}</h3></div><span class="incident-details__status">{{ incident.status.replace('_', ' ') }}</span></header>
            <p class="incident-details__description">{{ incident.description || 'No description provided.' }}</p>
            <dl class="incident-details__metadata">
              <div><dt>Service</dt><dd>{{ incident.service }}</dd></div>
              <div><dt>Environment</dt><dd>{{ incident.environment }}</dd></div>
              <div><dt>Origin</dt><dd>{{ incident.origin }}</dd></div>
              <div><dt>Severity</dt><dd>{{ incident.severity }}</dd></div>
            </dl>
            <div class="incident-assignment">
              <div><strong>Assignment status</strong><span>@if (incident.assignedDeveloper) { Assigned to {{ incident.assignedDeveloper }} } @else { Not assigned }</span></div>
              @if (incident.status !== 'CLOSED') {
                <label>
                  <span class="sr-only">Developer for {{ incident.incidentId }}</span>
                  <select [value]="selectedDeveloper(incident.incidentId)" (change)="selectDeveloper(incident.incidentId, $event)">
                    <option value="">Choose developer</option>
                    @for (developer of developers(); track developer.id) {
                      <option [value]="developer.username">{{ developer.firstName }} {{ developer.lastName }} ({{ developer.username }})</option>
                    }
                  </select>
                </label>
                <button class="button" type="button" [disabled]="!selectedDeveloper(incident.incidentId) || assigningIncident() === incident.incidentId" (click)="assignIncident(incident.incidentId)">{{ assigningIncident() === incident.incidentId ? 'Assigning…' : 'Assign developer' }}</button>
              } @else {
                <span class="assignment-closed">Closed incidents cannot be reassigned.</span>
              }
            </div>
          </article>
        }
      </section>
    </div>
  `,
  styles: [`.role-workspace,.assignment-queue{padding:1.25rem}.role-workspace__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.role-workspace__grid article{border-top:2px solid #168d83;padding:1rem .25rem}.role-workspace__index{font:600 .75rem ui-monospace,monospace;color:#168d83}.role-workspace h3{font-size:1rem;margin:.65rem 0}.role-workspace p{color:var(--text-muted,#94a3b8);line-height:1.5}.role-workspace a{color:#168d83;font-weight:600;text-decoration:none}.assignment-queue{margin-top:1rem}.assignment-table-wrap{overflow-x:auto}.assignment-table{width:100%;border-collapse:collapse;text-align:left}.assignment-table th,.assignment-table td{padding:.75rem;border-bottom:1px solid var(--border-subtle,#2f3b46);white-space:nowrap}.assignment-table th{font-size:.75rem;color:var(--text-muted,#94a3b8);font-weight:600}.assignment-table td:first-child{white-space:normal;min-width:12rem}.assignment-table td:first-child span{display:block;color:var(--text-muted,#94a3b8);margin-top:.25rem}.assignment-state{font-size:.85rem;font-weight:600}.assignment-state--assigned{color:#16745f}.assignment-state--unassigned{color:#9a5b12}.assignment-error{color:#b42318}.assignment-empty{color:var(--text-muted,#94a3b8)}.incident-details{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-subtle,#2f3b46)}.incident-details header{display:flex;justify-content:space-between;gap:1rem;align-items:start}.incident-details__id{font:600 .75rem ui-monospace,monospace;color:#168d83}.incident-details h3{margin:.3rem 0;font-size:1.1rem}.incident-details__status{font-size:.75rem;text-transform:capitalize}.incident-details__description{line-height:1.55;color:var(--text-muted,#64748b)}.incident-details__metadata{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:1rem 0}.incident-details__metadata dt{font-size:.72rem;color:var(--text-muted,#64748b)}.incident-details__metadata dd{margin:.25rem 0 0;font-weight:600}.incident-assignment{display:flex;align-items:end;gap:.75rem;padding-top:.9rem;border-top:1px solid var(--border-subtle,#2f3b46)}.incident-assignment>div{margin-right:auto}.incident-assignment>div span{display:block;margin-top:.25rem;color:var(--text-muted,#64748b);font-size:.85rem}.incident-assignment select{min-width:13rem;padding:.6rem;background:var(--surface,#fff);color:inherit;border:1px solid var(--border-subtle,#cbd5e1);border-radius:4px}@media(max-width:720px){.role-workspace__grid{grid-template-columns:1fr}.incident-details__metadata{grid-template-columns:repeat(2,minmax(0,1fr))}.incident-assignment{align-items:stretch;flex-direction:column}.incident-assignment>div{margin:0}.incident-assignment select{width:100%}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerDashboardComponent {
  private readonly incidentsApi = inject(IncidentsApiService);
  private readonly usersApi = inject(UserManagementApiService);
  private readonly incidents = signal<IncidentRecord[]>([]);
  readonly developers = signal<DeveloperDirectoryEntry[]>([]);
  readonly selectedDevelopers = signal<Record<string, string>>({});
  readonly selectedIncidentId = signal('');
  readonly assigningIncident = signal('');
  readonly assignmentError = signal('');
  readonly developersError = signal('');
  readonly loadError = signal('');
  readonly queueIncidents = computed(() => this.incidents());
  readonly selectedIncident = computed(() => this.incidents().find((incident) => incident.incidentId === this.selectedIncidentId()) ?? null);
  readonly metrics = computed(() => [
    {
      label: 'Open incidents',
      value: this.incidents().filter((incident) => incident.status === 'OPEN').length,
      detail: 'Awaiting response'
    },
    {
      label: 'Critical incidents',
      value: this.incidents().filter((incident) => incident.severity === 'CRITICAL' && incident.status !== 'CLOSED').length,
      detail: 'Open critical priority'
    },
    {
      label: 'Closed incidents',
      value: this.incidents().filter((incident) => incident.status === 'CLOSED').length,
      detail: 'Persisted closed records'
    }
  ]);

  constructor() {
    void this.loadIncidents();
    void this.loadDevelopers();
  }

  async loadIncidents(): Promise<void> {
    this.loadError.set('');
    try {
      const page = await firstValueFrom(this.incidentsApi.list());
      this.incidents.set(page.content);
    } catch {
      this.loadError.set('Incident counts could not be loaded.');
    }
  }

  async loadDevelopers(): Promise<void> {
    this.developersError.set('');
    try {
      this.developers.set(await firstValueFrom(this.usersApi.developers()));
    } catch {
      this.developersError.set('Developer accounts could not be loaded.');
    }
  }

  selectedDeveloper(incidentId: string): string {
    return this.selectedDevelopers()[incidentId]
      ?? this.incidents().find((incident) => incident.incidentId === incidentId)?.assignedDeveloper
      ?? '';
  }

  selectIncident(incidentId: string): void {
    this.selectedIncidentId.set(incidentId);
  }

  selectDeveloper(incidentId: string, event: Event): void {
    const developerUsername = (event.target as HTMLSelectElement).value;
    this.selectedDevelopers.update((selection) => ({ ...selection, [incidentId]: developerUsername }));
  }

  async assignIncident(incidentId: string): Promise<void> {
    const developerUsername = this.selectedDeveloper(incidentId);
    if (!developerUsername) return;
    this.assignmentError.set('');
    this.assigningIncident.set(incidentId);
    try {
      const updated = await firstValueFrom(this.incidentsApi.assignDeveloper(incidentId, developerUsername));
      this.incidents.update((items) => items.map((incident) => incident.incidentId === incidentId ? updated : incident));
    } catch {
      this.assignmentError.set(`Incident ${incidentId} could not be assigned. Try again.`);
    } finally {
      this.assigningIncident.set('');
    }
  }
}