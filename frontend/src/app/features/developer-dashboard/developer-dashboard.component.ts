import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';

@Component({
  selector: 'app-developer-dashboard',
  imports: [RouterLink],
  template: `
    <div class="dashboard-page role-dashboard">
      <header class="page-heading">
        <div><span class="eyebrow">Engineering response</span><h1>Developer workbench</h1>
          <p>Investigate incidents, record mitigations, and move active work toward resolution.</p></div>
        <a class="button" routerLink="/incidents">Open incidents</a>
      </header>
      <section class="metrics-grid" aria-label="Developer workflow">
        @for (metric of metrics(); track metric.label) {
          <article class="metric-card page-card"><span class="metric-card__label">{{ metric.label }}</span><strong class="metric-card__value">{{ metric.value }}</strong><span class="metric-card__delta">{{ metric.detail }}</span></article>
        }
      </section>
      @if (loadError()) { <p role="alert">{{ loadError() }} <button type="button" (click)="loadIncidents()">Retry</button></p> }
      <section class="role-workspace page-card">
        <div class="card-heading"><div><h2>Investigation flow</h2><p>A consistent path from first signal to verified recovery.</p></div></div>
        <ol class="developer-steps">
          <li><span>01</span><div><h3>Establish impact</h3><p>Confirm affected service, severity, and user impact in the incident record.</p></div></li>
          <li><span>02</span><div><h3>Investigate and mitigate</h3><p>Use the timeline to document findings and the recovery action.</p></div></li>
          <li><span>03</span><div><h3>Verify resolution</h3><p>Update status only after the service behavior has recovered.</p></div></li>
        </ol>
        <a class="button" routerLink="/incidents">Go to incident workspace</a>
      </section>
    </div>
  `,
  styles: [`.role-workspace{padding:1.25rem}.developer-steps{list-style:none;padding:0;margin:1rem 0 1.5rem;max-width:760px}.developer-steps li{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--border-subtle,#2f3b46)}.developer-steps li>span{font:600 .8rem ui-monospace,monospace;color:#287ac1}.developer-steps h3{font-size:1rem;margin:0 0 .35rem}.developer-steps p{margin:0;color:var(--text-muted,#94a3b8);line-height:1.5}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeveloperDashboardComponent {
  private readonly incidentsApi = inject(IncidentsApiService);
  private readonly incidents = signal<IncidentRecord[]>([]);
  readonly loadError = signal('');
  readonly metrics = computed(() => [
    {
      label: 'In progress',
      value: this.incidents().filter((incident) => incident.status === 'IN_PROGRESS').length,
      detail: 'Active investigations'
    },
    {
      label: 'Critical priority',
      value: this.incidents().filter((incident) => incident.severity === 'CRITICAL' && incident.status !== 'CLOSED').length,
      detail: 'Still open'
    },
    {
      label: 'All incidents',
      value: this.incidents().length,
      detail: 'Persisted records'
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