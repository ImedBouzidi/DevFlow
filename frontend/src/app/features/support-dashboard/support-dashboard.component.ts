import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-support-dashboard',
  imports: [RouterLink],
  template: `
    <div class="dashboard-page role-dashboard">
      <header class="page-heading">
        <div><span class="eyebrow">Service desk</span><h1>Support overview</h1>
          <p>Keep customer impact visible and route service issues to the right response team.</p></div>
        <a class="button" routerLink="/incidents">View incident queue</a>
      </header>
      <div class="sample-note" role="note"><span class="sample-note__dot"></span>Review incident severity and status before communicating service impact.</div>
      <section class="metrics-grid" aria-label="Support priorities">
        <article class="metric-card page-card"><span class="metric-card__label">Incoming reports</span><strong class="metric-card__value">Review</strong><span class="metric-card__delta">Check the incident queue</span></article>
        <article class="metric-card page-card"><span class="metric-card__label">Customer impact</span><strong class="metric-card__value">Clarify</strong><span class="metric-card__delta">Confirm affected services and users</span></article>
        <article class="metric-card page-card"><span class="metric-card__label">Communications</span><strong class="metric-card__value">Update</strong><span class="metric-card__delta">Use the latest verified status</span></article>
      </section>
      <section class="support-columns">
        <article class="page-card support-focus"><span class="support-focus__label">First response</span><h2>Confirm what is affected</h2><p>Check incident details, affected service, and current status before sending a customer update.</p><a routerLink="/incidents">Review incidents <span aria-hidden="true">→</span></a></article>
        <article class="page-card support-focus support-focus--secondary"><span class="support-focus__label">Escalation</span><h2>Route technical issues</h2><p>Escalate reproducible service failures with the incident reference and impact summary.</p><a routerLink="/incidents">Open service queue <span aria-hidden="true">→</span></a></article>
      </section>
    </div>
  `,
  styles: [`.support-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.support-focus{padding:1.25rem;border-top:3px solid #d8912e}.support-focus--secondary{border-top-color:#287ac1}.support-focus__label{font-size:.75rem;text-transform:uppercase;color:var(--text-muted,#94a3b8)}.support-focus h2{font-size:1.15rem;margin:.75rem 0}.support-focus p{line-height:1.55;color:var(--text-muted,#94a3b8)}.support-focus a{color:#c07a19;font-weight:600;text-decoration:none}@media(max-width:720px){.support-columns{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportDashboardComponent {}