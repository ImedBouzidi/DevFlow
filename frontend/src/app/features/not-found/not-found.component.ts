import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="not-found">
      <div class="not-found__card page-card">
        <span class="brand-mark" aria-hidden="true">404</span>
        <span class="eyebrow">Page not found</span>
        <h1>This route is not in the runbook.</h1>
        <p>The page may have moved, or you may not have access to it.</p>
        <a class="button" routerLink="/dashboard">Return to dashboard</a>
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .not-found { display: grid; min-height: 100vh; place-items: center; padding: 24px; background: #f7f9fc; }
    .not-found__card { max-width: 480px; padding: 48px; text-align: center; }
    .brand-mark { margin-bottom: 20px; font-size: 10px; font-weight: 800; }
    h1 { margin: 9px 0; color: var(--ink-950); font-size: 28px; letter-spacing: -.04em; }
    p { margin: 0 0 24px; color: var(--ink-500); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {}
