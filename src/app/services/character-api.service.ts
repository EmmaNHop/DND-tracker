import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Character } from '../features/characterDashboard/character.types';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CharacterApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  list(): Observable<Character[]> {
    return this.http.get<Character[]>('/api/characters', {
      headers: this.auth.authenticatedHeaders()
    });
  }

  create(character: Omit<Character, 'id'>): Observable<Character> {
    return this.http.post<Character>('/api/characters', character, {
      headers: this.auth.authenticatedHeaders()
    });
  }

  update(character: Character, updates: Partial<Character>): Observable<Character> {
    return this.http.put<Character>(`/api/characters/${encodeURIComponent(character.id)}`, {
      ...character,
      ...updates
    }, {
      headers: this.auth.authenticatedHeaders()
    });
  }
}
