import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';

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
    </div>
  `,
  styles: [`.role-workspace{padding:1.25rem}.role-workspace__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.role-workspace__grid article{border-top:2px solid #168d83;padding:1rem .25rem}.role-workspace__index{font:600 .75rem ui-monospace,monospace;color:#168d83}.role-workspace h3{font-size:1rem;margin:.65rem 0}.role-workspace p{color:var(--text-muted,#94a3b8);line-height:1.5}.role-workspace a{color:#168d83;font-weight:600;text-decoration:none}@media(max-width:720px){.role-workspace__grid{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerDashboardComponent {
  private readonly incidentsApi = inject(IncidentsApiService);
  private readonly incidents = signal<IncidentRecord[]>([]);
  readonly loadError = signal('');
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
}