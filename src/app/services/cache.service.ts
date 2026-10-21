import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 1 hour)
   */
  set<T>(key: string, data: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a cache entry exists and is still valid
   * @param key Cache key
   * @returns true if cache entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific cache entry
   * @param key Cache key
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   * @param pattern Pattern to match cache keys
   */
  clearPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    cacheSize: string;
  } {
    let totalSize = 0;
    let validEntries = 0;

    this.cache.forEach((entry, key) => {
      const isExpired = Date.now() - entry.timestamp > entry.ttl;
      if (!isExpired) {
        validEntries++;
        // Rough estimate of size
        totalSize += JSON.stringify(entry.data).length;
      } else {
        this.cache.delete(key);
      }
    });

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

    return {
      totalEntries: validEntries,
      cacheSize: `${sizeInMB} MB`
    };
  }
}

