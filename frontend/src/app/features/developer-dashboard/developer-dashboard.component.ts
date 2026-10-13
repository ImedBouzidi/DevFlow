import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IncidentAnalysis, IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-developer-dashboard',
  imports: [DecimalPipe, RouterLink],
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
      <section class="developer-tasks page-card" aria-labelledby="tasks-title">
        <div class="card-heading"><div><h2 id="tasks-title">Assigned tasks</h2><p>Incidents assigned to {{ auth.username() || 'your account' }}.</p></div></div>
        @if (loadError()) { <p class="task-error" role="alert">{{ loadError() }} <button type="button" (click)="loadIncidents()">Retry</button></p> }
        @for (task of assignedTasks(); track task.incidentId) {
          <article class="task-row">
            <div class="task-row__summary">
              <div><span class="task-id">{{ task.incidentId }}</span><h3>{{ task.title }}</h3><p>{{ task.service }} · {{ task.environment }} · {{ task.severity }} · <span class="task-status">{{ task.status.replace('_', ' ') }}</span></p></div>
              <div class="task-actions">
                <button class="button button--secondary" type="button" [disabled]="analyzingTask() === task.incidentId" (click)="analyzeTask(task)">{{ analyzingTask() === task.incidentId ? 'Analyzing…' : 'Analyze & predict' }}</button>
                @if (task.status === 'OPEN') {
                  <button class="button" type="button" [disabled]="updatingStatus() === task.incidentId" (click)="updateTaskStatus(task)">{{ updatingStatus() === task.incidentId ? 'Updating…' : 'Mark in progress' }}</button>
                } @else if (task.status === 'IN_PROGRESS') {
                  <button class="button" type="button" [disabled]="updatingStatus() === task.incidentId" (click)="updateTaskStatus(task)">{{ updatingStatus() === task.incidentId ? 'Updating…' : 'Close incident' }}</button>
                }
              </div>
            </div>
            @if (statusErrors()[task.incidentId]) { <p class="task-error" role="alert">{{ statusErrors()[task.incidentId] }}</p> }
            @if (analyzingTask() === task.incidentId) {
              <p class="task-progress" role="status"><span class="progress-indicator" aria-hidden="true"></span>Sending incident details and telemetry to the AI analysis service. It returns severity, category, and estimated resolution time.</p>
            }
            @if (analysisErrors()[task.incidentId]) { <p class="task-error" role="alert">{{ analysisErrors()[task.incidentId] }}</p> }
            @if (analysisResults()[task.incidentId]; as result) {
              <section class="task-analysis" aria-label="AI prediction result" aria-live="polite">
                <h4>AI prediction · advisory</h4>
                <dl>
                  <div><dt>Suggested severity</dt><dd>{{ result.severity.value }}@if (result.severity.confidence !== null) { <span>{{ result.severity.confidence * 100 | number:'1.0-0' }}% confidence</span> }</dd></div>
                  <div><dt>Suggested category</dt><dd>{{ result.category.value }}@if (result.category.confidence !== null) { <span>{{ result.category.confidence * 100 | number:'1.0-0' }}% confidence</span> }</dd></div>
                  <div><dt>Estimated resolution</dt><dd>{{ result.resolution_time_hours | number:'1.1-1' }} h</dd></div>
                </dl>
                <p>Prediction is advisory. Validate it against the incident evidence before taking action.</p>
              </section>
            }
          </article>
        } @empty {
          @if (!loadError()) { <p class="tasks-empty">No incidents are assigned to your account.</p> }
        }
      </section>
    </div>
  `,
  styles: [`.role-workspace,.developer-tasks{padding:1.25rem}.developer-steps{list-style:none;padding:0;margin:1rem 0 1.5rem;max-width:760px}.developer-steps li{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--border-subtle,#2f3b46)}.developer-steps li>span{font:600 .8rem ui-monospace,monospace;color:#287ac1}.developer-steps h3{font-size:1rem;margin:0 0 .35rem}.developer-steps p{margin:0;color:var(--text-muted,#94a3b8);line-height:1.5}.developer-tasks{margin-top:1rem}.task-row{padding:1rem 0;border-top:1px solid var(--border-subtle,#2f3b46)}.task-row__summary{display:flex;justify-content:space-between;align-items:center;gap:1rem}.task-id{font:600 .75rem ui-monospace,monospace;color:#168d83}.task-row h3{font-size:1rem;margin:.35rem 0}.task-row__summary p,.tasks-empty{margin:.25rem 0 0;color:var(--text-muted,#94a3b8)}.task-status{text-transform:capitalize}.task-actions{display:flex;flex-wrap:wrap;gap:.5rem}.task-progress{display:flex;align-items:center;gap:.6rem;margin:1rem 0;color:#287ac1}.progress-indicator{width:.7rem;height:.7rem;flex:0 0 .7rem;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:task-spin .8s linear infinite}@keyframes task-spin{to{transform:rotate(360deg)}}.task-analysis{margin-top:1rem;padding-top:.85rem;border-top:1px solid var(--border-subtle,#2f3b46)}.task-analysis h4{margin:0 0 .75rem;font-size:.9rem}.task-analysis dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:0}.task-analysis dl div{padding:.75rem;background:var(--surface-muted,#f5f7f8);border-radius:4px}.task-analysis dt{font-size:.75rem;color:var(--text-muted,#64748b)}.task-analysis dd{margin:.35rem 0 0;font-weight:650}.task-analysis dd span{display:block;margin-top:.2rem;font-size:.75rem;font-weight:400;color:var(--text-muted,#64748b)}.task-analysis>p,.task-error{font-size:.85rem;color:var(--text-muted,#64748b)}.task-error{color:#b42318}.task-row__summary button{flex:0 0 auto}@media(max-width:650px){.task-row__summary{align-items:flex-start;flex-direction:column}.task-analysis dl{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeveloperDashboardComponent {
  private readonly incidentsApi = inject(IncidentsApiService);
  readonly auth = inject(AuthService);
  private readonly incidents = signal<IncidentRecord[]>([]);
  readonly analysisResults = signal<Record<string, IncidentAnalysis>>({});
  readonly analysisErrors = signal<Record<string, string>>({});
  readonly statusErrors = signal<Record<string, string>>({});
  readonly analyzingTask = signal('');
  readonly updatingStatus = signal('');
  readonly loadError = signal('');
  readonly assignedTasks = computed(() => {
    const username = this.auth.username().toLowerCase();
    return this.incidents().filter((incident) => incident.assignedDeveloper?.toLowerCase() === username);
  });
  readonly metrics = computed(() => [
    {
      label: 'In progress',
      value: this.assignedTasks().filter((incident) => incident.status === 'IN_PROGRESS').length,
      detail: 'Active investigations'
    },
    {
      label: 'Critical priority',
      value: this.assignedTasks().filter((incident) => incident.severity === 'CRITICAL' && incident.status !== 'CLOSED').length,
      detail: 'Still open'
    },
    {
      label: 'All incidents',
      value: this.assignedTasks().length,
      detail: 'Persisted records'
    }
  ]);

  constructor() {
    void this.loadIncidents();
  }

  async loadIncidents(): Promise<void> {
    this.loadError.set('');
    try {
      const page = await firstValueFrom(this.incidentsApi.listAssignedToMe());
      this.incidents.set(page.content);
    } catch {
      this.loadError.set('Incident counts could not be loaded.');
    }
  }

  async analyzeTask(incident: IncidentRecord): Promise<void> {
    this.analysisErrors.update((errors) => ({ ...errors, [incident.incidentId]: '' }));
    this.analyzingTask.set(incident.incidentId);
    try {
      const result = await firstValueFrom(this.incidentsApi.analyze({
        title: incident.title,
        description: incident.description ?? '',
        service: incident.service,
        environment: incident.environment,
        origin: incident.origin,
        initialContext: incident.initialContext
      }));
      this.analysisResults.update((results) => ({ ...results, [incident.incidentId]: result }));
    } catch (error) {
      const message = error instanceof HttpErrorResponse && error.status === 0
        ? 'AI analysis service could not be reached. Check that it is running and try again.'
        : 'AI analysis failed. Check the incident data and try again.';
      this.analysisErrors.update((errors) => ({ ...errors, [incident.incidentId]: message }));
    } finally {
      this.analyzingTask.set('');
    }
  }

  async updateTaskStatus(incident: IncidentRecord): Promise<void> {
    if (incident.status !== 'OPEN' && incident.status !== 'IN_PROGRESS') return;
    this.statusErrors.update((errors) => ({ ...errors, [incident.incidentId]: '' }));
    this.updatingStatus.set(incident.incidentId);
    try {
      const updated = await firstValueFrom(incident.status === 'OPEN'
        ? this.incidentsApi.markInProgress(incident.incidentId)
        : this.incidentsApi.close(incident.incidentId));
      this.incidents.update((items) => items.map((item) => item.incidentId === incident.incidentId ? updated : item));
    } catch {
      this.statusErrors.update((errors) => ({ ...errors, [incident.incidentId]: 'Incident status could not be updated. Try again.' }));
    } finally {
      this.updatingStatus.set('');
    }
  }
}