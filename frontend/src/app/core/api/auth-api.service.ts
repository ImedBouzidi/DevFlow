import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserProfile } from '../auth/auth.models';

export interface UpdateCurrentUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/auth`;

  currentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.endpoint}/me`);
  }

  updateCurrentUser(request: UpdateCurrentUserRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.endpoint}/me`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/me/password`, request);
  }
}
