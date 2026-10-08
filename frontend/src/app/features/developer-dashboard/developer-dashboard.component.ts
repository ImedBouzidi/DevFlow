import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
      <div class="sample-note" role="note"><span class="sample-note__dot"></span>Incident details and status are available in the incident workspace.</div>
      <section class="metrics-grid" aria-label="Developer workflow">
        <article class="metric-card page-card"><span class="metric-card__label">Investigation</span><strong class="metric-card__value">Triage</strong><span class="metric-card__delta">Start with the highest severity</span></article>
        <article class="metric-card page-card"><span class="metric-card__label">Mitigation</span><strong class="metric-card__value">Resolve</strong><span class="metric-card__delta">Record the action and outcome</span></article>
        <article class="metric-card page-card"><span class="metric-card__label">Knowledge</span><strong class="metric-card__value">Capture</strong><span class="metric-card__delta">Leave a useful resolution trail</span></article>
      </section>
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
export class DeveloperDashboardComponent {}