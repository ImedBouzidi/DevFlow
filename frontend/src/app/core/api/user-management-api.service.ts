import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export const USER_ROLES = [
  'ROLE_ADMIN',
  'ROLE_MANAGER',
  'ROLE_DEVELOPER',
  'ROLE_SUPPORT'
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roles: UserRole[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateManagedUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
}

export interface UpdateManagedUser {
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/auth/users`;

  list(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.endpoint);
  }

  create(request: CreateManagedUser): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.endpoint, request);
  }

  update(id: string, request: UpdateManagedUser): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`${this.endpoint}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}