import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface IncidentAnalysis {
  severity: { value: string; confidence: number | null };
  category: { value: string; confidence: number | null };
  resolution_time_hours: number;
}

export interface InitialContext {
  errorCode: string | null;
  httpStatus: number | null;
  cpuPercent: number | null;
  memoryPercent: number | null;
  latencyMs: number | null;
  errorRatePercent: number | null;
  affectedUsers: number | null;
  isBusinessHours: boolean;
  isWeekend: boolean;
}

export interface CreateIncidentRequest {
  title: string;
  description: string;
  service: string;
  environment: string;
  origin: string;
  severity: string;
  category: string;
  initialContext: InitialContext;
}

export interface IncidentAnalysisRequest {
  title: string;
  description: string;
  service: string;
  environment: string;
  origin: string;
  initialContext?: Partial<InitialContext> | null;
}

export interface IncidentRecord {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  category: string;
  service: string;
  environment: string;
  origin: string;
  assignedDeveloper: string | null;
  createdAt: string;
  initialContext: InitialContext | null;
  labels: {
    severityTarget: string | null;
    categoryTarget: string | null;
    resolutionTimeTargetHours: number | null;
  } | null;
}

export interface IncidentPage {
  content: IncidentRecord[];
  totalElements: number;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
  private readonly http = inject(HttpClient);
  private readonly incidentEndpoint = `${environment.apiBaseUrl}/api/incidents`;
  private readonly analysisEndpoint = `${environment.aiAnalysisBaseUrl}/api/v1/predictions/incident`;

  list(): Observable<IncidentPage> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sort', 'createdAt,desc');
    return this.http.get<IncidentPage>(this.incidentEndpoint, { params });
  }

  listAssignedToMe(): Observable<IncidentPage> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sort', 'createdAt,desc');
    return this.http.get<IncidentPage>(`${this.incidentEndpoint}/assigned-to-me`, { params });
  }

  create(request: CreateIncidentRequest): Observable<IncidentRecord> {
    return this.http.post<IncidentRecord>(this.incidentEndpoint, request);
  }

  assignDeveloper(incidentId: string, developerUsername: string): Observable<IncidentRecord> {
    return this.http.patch<IncidentRecord>(`${this.incidentEndpoint}/${incidentId}/assignment`, {
      developerUsername
    });
  }

  markInProgress(incidentId: string): Observable<IncidentRecord> {
    return this.http.patch<IncidentRecord>(`${this.incidentEndpoint}/${incidentId}/in-progress`, null);
  }

  close(incidentId: string): Observable<IncidentRecord> {
    return this.http.patch<IncidentRecord>(`${this.incidentEndpoint}/${incidentId}/close`, null);
  }

  analyze(request: IncidentAnalysisRequest): Observable<IncidentAnalysis> {
    const context = request.initialContext;
    return this.http.post<IncidentAnalysis>(this.analysisEndpoint, {
      title: request.title,
      description: request.description,
      service: request.service,
      environment: request.environment.toLowerCase(),
      origin: request.origin,
      initial_context: context ? {
        error_code: context.errorCode ?? null,
        http_status: context.httpStatus ?? null,
        cpu_percent: context.cpuPercent ?? null,
        memory_percent: context.memoryPercent ?? null,
        latency_ms: context.latencyMs ?? null,
        error_rate_percent: context.errorRatePercent ?? null,
        affected_users: context.affectedUsers ?? null,
        is_business_hours: context.isBusinessHours ?? null,
        is_weekend: context.isWeekend ?? null
      } : {}
    });
  }
}
