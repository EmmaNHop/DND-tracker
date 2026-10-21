import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('only returns content from official SRD documents', () => {
    let results: Record<string, unknown>[] = [];
    service.getRaces().subscribe(response => {
      results = response.results;
    });

    const request = httpMock.expectOne('/api/content/races');
    request.flush({
      results: [
        { name: 'Elf', document__slug: 'wotc-srd' },
        { name: 'Homebrew race', document__slug: 'third-party-source' },
        { name: 'Unattributed race' }
      ]
    });

    expect(results.map(race => race['name'])).toEqual(['Elf']);
  });

  it('allows backgrounds from any source', () => {
    let results: Record<string, unknown>[] = [];
    service.getBackgrounds().subscribe(response => {
      results = response.results;
    });

    const request = httpMock.expectOne('/api/content/backgrounds');
    request.flush({
      results: [
        { name: 'Acolyte', document__slug: 'wotc-srd' },
        { name: 'Third-party background', document__slug: 'third-party-source' },
        { name: 'Unattributed background' }
      ]
    });

    expect(results.map(background => background['name'])).toEqual([
      'Acolyte',
      'Third-party background',
      'Unattributed background'
    ]);
  });

  it('filters official spells returned by the backend', () => {
    let results: Record<string, unknown>[] = [];
    service.getSpells().subscribe(response => {
      results = response.results;
    });

    httpMock.expectOne('/api/content/spells').flush({
      count: 5,
      next: null,
      results: [
        { name: 'Magic Missile', document__slug: 'wotc-srd' },
        { name: 'A5E Official Spell', key: 'a5e-ag_accelerando', document__slug: 'a5e-ag' },
        { name: 'Third-party spell', document__slug: 'third-party-source' },
        { name: 'Fireball', document: { key: 'wotc-srd-2024' } },
        { name: 'Third-party A5E-like spell', key: 'thirdparty_spell' }
      ]
    });

    expect(results.map(spell => spell['name'])).toEqual(['Magic Missile', 'A5E Official Spell', 'Fireball']);
  });
});
