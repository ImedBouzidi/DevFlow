import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RegisterRequest, UserProfile } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/auth`;

  register(request: RegisterRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.endpoint}/register`, request);
  }

  currentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.endpoint}/me`);
  }
}
