import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { IncidentRecord, IncidentsApiService } from '../../core/api/incidents-api.service';

interface MetricCard {
  label: string;
  value: number;
  icon: 'incidents' | 'open' | 'critical' | 'resolved' | 'time' | 'mttr';
  tone: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#e5484d',
  HIGH: '#f28a30',
  MEDIUM: '#377de5',
  LOW: '#36a69b'
};

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  private readonly incidentsApi = inject(IncidentsApiService);
  readonly incidents = signal<IncidentRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly metrics = computed<MetricCard[]>(() => {
    const incidents = this.incidents();
    return [
      { label: 'Total incidents', value: incidents.length, icon: 'incidents', tone: 'blue' },
      { label: 'Active incidents', value: incidents.filter((incident) => incident.status !== 'CLOSED').length, icon: 'open', tone: 'blue' },
      { label: 'Critical incidents', value: incidents.filter((incident) => incident.severity === 'CRITICAL').length, icon: 'critical', tone: 'red' },
      { label: 'Closed incidents', value: incidents.filter((incident) => incident.status === 'CLOSED').length, icon: 'resolved', tone: 'green' }
    ];
  });
  readonly severity = computed(() => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
    const count = this.incidents().filter((incident) => incident.severity === severity).length;
    const total = this.incidents().length;
    return {
      label: this.displayEnum(severity),
      count,
      width: total ? Math.round((count / total) * 100) : 0,
      color: SEVERITY_COLORS[severity]
    };
  }));
  readonly services = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.incidents()) {
      counts.set(incident.service, (counts.get(incident.service) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.incidents().length ? Math.round((count / this.incidents().length) * 100) : 0
      }));
  });
  readonly serviceChartBackground = computed(() => {
    const total = this.incidents().length;
    if (!total) return 'conic-gradient(#d9dee7 0% 100%)';
    const colors = ['#3d7eea', '#34a69d', '#8c6ade', '#d8912e'];
    let position = 0;
    const segments = this.services().map((service, index) => {
      const end = position + (service.count / total) * 100;
      const segment = `${colors[index]} ${position}% ${end}%`;
      position = end;
      return segment;
    });
    if (position < 100) segments.push(`#d9dee7 ${position}% 100%`);
    return `conic-gradient(${segments.join(', ')})`;
  });
  readonly recentIncidents = computed(() => this.incidents()
    .filter((incident) => incident.severity === 'CRITICAL')
    .slice(0, 5));

  constructor() {
    void this.loadIncidents();
  }

  async loadIncidents(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const page = await firstValueFrom(this.incidentsApi.list());
      this.incidents.set(page.content);
    } catch {
      this.loadError.set('Incident data could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  displayEnum(value: string): string {
    return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  statusClass(status: string): string {
    return status.toLowerCase().replaceAll('_', '-');
  }
}
