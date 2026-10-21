import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);

  register(email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password }).pipe(
      tap(session => this.setSession(session)),
      map(session => session.user)
    );
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(session => this.setSession(session)),
      map(session => session.user)
    );
  }

  restoreSession(): Observable<AuthUser | null> {
    const token = this.token();
    if (!token) {
      return of(null);
    }
    return this.http.get<AuthUser>('/api/auth/me', { headers: this.headers() }).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
  }

  authenticatedHeaders(): HttpHeaders {
    return this.headers();
  }

  private headers(): HttpHeaders {
    const token = this.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private setSession(session: AuthResponse): void {
    this.token.set(session.token);
    this.currentUser.set(session.user);
  }
}
