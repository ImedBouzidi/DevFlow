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

  create(request: CreateIncidentRequest): Observable<IncidentRecord> {
    return this.http.post<IncidentRecord>(this.incidentEndpoint, request);
  }

  analyze(request: CreateIncidentRequest): Observable<IncidentAnalysis> {
    return this.http.post<IncidentAnalysis>(this.analysisEndpoint, {
      title: request.title,
      description: request.description,
      service: request.service,
      environment: request.environment.toLowerCase(),
      origin: request.origin,
      initial_context: {
        error_code: request.initialContext.errorCode,
        http_status: request.initialContext.httpStatus,
        cpu_percent: request.initialContext.cpuPercent,
        memory_percent: request.initialContext.memoryPercent,
        latency_ms: request.initialContext.latencyMs,
        error_rate_percent: request.initialContext.errorRatePercent,
        affected_users: request.initialContext.affectedUsers,
        is_business_hours: request.initialContext.isBusinessHours,
        is_weekend: request.initialContext.isWeekend
      }
    });
  }
}
