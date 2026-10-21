import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import { CacheService } from './cache.service';

interface SpellPageResponse {
  count?: number;
  next: string | null;
  results: Record<string, unknown>[];
}

const OFFICIAL_DOCUMENT_SLUGS = new Set(['wotc-srd', 'wotc-srd-2024']);

function isOfficialContent(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const document = typeof record['document'] === 'object' && record['document'] !== null
    ? record['document'] as Record<string, unknown>
    : null;
  const slug = record['document__slug'] ??
    record['document__key'] ??
    document?.['slug'] ??
    document?.['key'];

  return typeof slug === 'string' && OFFICIAL_DOCUMENT_SLUGS.has(slug.trim().toLocaleLowerCase());
}

function isOfficialSpell(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const key = record['key'];
  return (typeof key === 'string' && key.toLocaleLowerCase().startsWith('a5e')) ||
    isOfficialContent(value);
}

function filterOfficialContent(response: unknown): unknown {
  if (Array.isArray(response)) {
    return response.filter(isOfficialContent);
  }
  if (typeof response !== 'object' || response === null) {
    return response;
  }

  const record = response as Record<string, unknown>;
  if (!Array.isArray(record['results'])) {
    return response;
  }
  const results = record['results'].filter(isOfficialContent);
  return { ...record, count: results.length, results };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  protected http = inject(HttpClient);
  protected cacheService = inject(CacheService);

  // Default cache duration: 24 hours
  private defaultCacheDuration = 24 * 60 * 60 * 1000;

  /**
   * Wrapper method for API calls with caching
   * @param cacheKey Key to use for caching
   * @param apiCall Observable from HTTP call
   * @param cacheDuration How long to cache in milliseconds
   */
  private withCache<T>(
    cacheKey: string,
    apiCall: Observable<T>,
    cacheDuration: number = this.defaultCacheDuration
  ): Observable<T> {
    // Check if data is in cache
    const cachedData = this.cacheService.get<T>(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    // If not in cache, make the API call and cache the result
    return apiCall.pipe(
      tap(data => {
        this.cacheService.set(cacheKey, data, cacheDuration);
      })
    );
  }

  private withOfficialCache<T>(cacheKey: string, apiCall: Observable<T>): Observable<any> {
    return this.withCache(cacheKey, apiCall).pipe(map(filterOfficialContent));
  }

  getRaces(): Observable<any> {
    return this.withOfficialCache('races', this.http.get('/api/content/races'));
  }

  getClasses(): Observable<any> {
    return this.withOfficialCache('classes', this.http.get('/api/content/classes'));
  }

  getBackgrounds(): Observable<any> {
    return this.withCache('backgrounds-all', this.http.get('/api/content/backgrounds'));
  }

  getSpells(): Observable<SpellPageResponse> {
    const allPages = this.http.get<SpellPageResponse>('/api/content/spells').pipe(
      map(page => {
        const results = page.results.filter(isOfficialSpell);
        return { ...page, count: results.length, results };
      })
    );
    return this.withOfficialCache('spells', allPages);
  }

  getSpellLists(): Observable<any> {
    return this.withOfficialCache('spelllists', this.http.get('/api/content/spelllists'));
  }

  getMonsters(): Observable<any> {
    return this.withOfficialCache('monsters', this.http.get('/api/content/monsters'));
  }

  getWeapons(): Observable<any> {
    return this.withOfficialCache('weapons', this.http.get('/api/content/weapons'));
  }

  getArmor(): Observable<any> {
    return this.withOfficialCache('armor', this.http.get('/api/content/armor'));
  }

  getPlanes(): Observable<any> {
    return this.withOfficialCache('planes', this.http.get('/api/content/planes'));
  }

  getFeats(): Observable<any> {
    return this.withOfficialCache('feats', this.http.get('/api/content/feats'));
  }

  getConditions(): Observable<any> {
    return this.withOfficialCache('conditions', this.http.get('/api/content/conditions'));
  }

  getMagicItems(): Observable<any> {
    return this.withOfficialCache('magicitems', this.http.get('/api/content/magicitems'));
  }

  /**
   * Clear all cached API data
   */
  clearAllCache(): void {
    this.cacheService.clear();
  }

  /**
   * Clear cache for a specific data type
   * @param cacheKey The cache key to remove
   */
  clearCacheForKey(cacheKey: string): void {
    this.cacheService.remove(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }
}
