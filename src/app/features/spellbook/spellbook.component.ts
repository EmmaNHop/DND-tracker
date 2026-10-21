import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CharacterCreationStore } from '../characterDashboard/characterCreation.store';
import { Character, CharacterCreationOption } from '../characterDashboard/character.types';
import { CharacterApiService } from '../../services/character-api.service';

type SpellbookTab = 'available' | 'known' | 'prepared';

@Component({
  selector: 'app-spellbook',
  imports: [CommonModule, RouterLink],
  templateUrl: './spellbook.component.html',
  styleUrl: './spellbook.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpellbookComponent implements OnInit {
  protected readonly characterStore = inject(CharacterCreationStore);
  private readonly characterApi = inject(CharacterApiService);
  protected readonly selectedCharacterId = signal<string | null>(null);
  protected readonly persistenceError = signal<string | null>(null);
  protected readonly isSavingChanges = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedLevel = signal('all');
  protected readonly activeTab = signal<SpellbookTab>('available');
  protected readonly expandedSpellId = signal<string | null>(null);
  protected readonly selectedCharacter = computed(() => {
    const characters = this.characterStore.characters();
    const selectedId = this.selectedCharacterId();
    return characters.find(character => character.id === selectedId) ?? characters[0] ?? null;
  });
  protected readonly availableSpells = computed(() => this.characterStore.spells());
  protected readonly filteredSpells = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const level = this.selectedLevel();

    return this.availableSpells().filter(spell => {
      const belongsToTab = this.activeTab() === 'available'
        ? !this.isKnown(spell)
        : this.activeTab() === 'known'
          ? this.isKnown(spell)
          : this.isPrepared(spell);
      const matchesSearch = !search ||
        spell.name.toLocaleLowerCase().includes(search) ||
        this.getSpellText(spell['desc']).toLocaleLowerCase().includes(search) ||
        this.getSpellText(spell['school']).toLocaleLowerCase().includes(search);
      const matchesLevel = level === 'all' || this.getSpellLevel(spell) === level;
      return belongsToTab && matchesSearch && matchesLevel;
    });
  });
  protected readonly knownCount = computed(() =>
    this.availableSpells().filter(spell => this.isKnown(spell)).length
  );
  protected readonly preparedCount = computed(() =>
    this.availableSpells().filter(spell => this.isPrepared(spell)).length
  );
  protected readonly availableCount = computed(() =>
    this.availableSpells().filter(spell => {
      const matchesLevel = this.selectedLevel() === 'all' || this.getSpellLevel(spell) === this.selectedLevel();
      const search = this.searchTerm().trim().toLocaleLowerCase();
      const matchesSearch = !search ||
        spell.name.toLocaleLowerCase().includes(search) ||
        this.getSpellText(spell['desc']).toLocaleLowerCase().includes(search) ||
        this.getSpellText(spell['school']).toLocaleLowerCase().includes(search);
      return !this.isKnown(spell) && matchesLevel && matchesSearch;
    }).length
  );
  protected readonly availableLabel = computed(() => {
    const level = this.selectedLevel();
    if (level === 'all') {
      return 'Choose from';
    }
    return level === '0' ? 'Choose from Cantrips' : `Choose from Level ${level}`;
  });

  ngOnInit(): void {
    if (!this.characterStore.hasSpells() && !this.characterStore.spellsLoading()) {
      this.characterStore.loadSpells();
    }
  }

  protected selectCharacter(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedCharacterId.set(event.target.value || null);
    }
  }

  protected updateSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTerm.set(event.target.value);
    }
  }

  protected updateLevel(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedLevel.set(event.target.value);
      this.expandedSpellId.set(null);
    }
  }

  protected selectTab(tab: SpellbookTab): void {
    this.activeTab.set(tab);
    this.expandedSpellId.set(null);
  }

  protected getSpellId(spell: CharacterCreationOption): string {
    const slug = spell['slug'] ?? spell['key'] ?? spell['url'] ?? spell.name;
    return String(slug).toLocaleLowerCase();
  }

  protected getSpellLevel(spell: CharacterCreationOption): string {
    const value = spell['level_int'] ?? spell['level'] ?? spell['spell_level'];
    if (value === undefined || value === null || value === '') {
      return '0';
    }
    const normalized = String(value).toLocaleLowerCase();
    if (normalized === 'cantrip') {
      return '0';
    }
    const numericLevel = normalized.match(/\d+/)?.[0];
    return numericLevel ?? normalized;
  }

  protected getSpellLevelLabel(spell: CharacterCreationOption): string {
    const level = this.getSpellLevel(spell);
    return level === '0' ? 'Cantrip' : `Level ${level}`;
  }

  protected getSpellText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map(item => this.getSpellText(item)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([key, item]) => {
          const text = this.getSpellText(item);
          return text ? `${key.replace(/_/g, ' ')}: ${text}` : '';
        })
        .filter(Boolean)
        .join('; ');
    }
    return '';
  }

  protected getSpellMeta(spell: CharacterCreationOption): string[] {
    return [
      this.getSpellLevelLabel(spell),
      this.getSpellText(spell['school']),
      this.getSpellText(spell['casting_time']),
      this.getSpellText(spell['range'])
    ].filter(Boolean);
  }

  protected isKnown(spell: CharacterCreationOption): boolean {
    return this.selectedCharacter()?.knownSpells?.includes(this.getSpellId(spell)) ?? false;
  }

  protected isPrepared(spell: CharacterCreationOption): boolean {
    return this.selectedCharacter()?.preparedSpells?.includes(this.getSpellId(spell)) ?? false;
  }

  protected toggleKnown(spell: CharacterCreationOption): void {
    const character = this.selectedCharacter();
    if (!character) {
      return;
    }

    const id = this.getSpellId(spell);
    const knownSpells = character.knownSpells ?? [];
    const preparedSpells = character.preparedSpells ?? [];
    const removing = knownSpells.includes(id);
    this.saveCharacterUpdates(character, {
      knownSpells: removing ? knownSpells.filter(spellId => spellId !== id) : [...knownSpells, id],
      preparedSpells: removing ? preparedSpells.filter(spellId => spellId !== id) : preparedSpells
    });
  }

  protected togglePrepared(spell: CharacterCreationOption): void {
    const character = this.selectedCharacter();
    if (!character || !this.isKnown(spell)) {
      return;
    }

    const id = this.getSpellId(spell);
    const preparedSpells = character.preparedSpells ?? [];
    this.saveCharacterUpdates(character, {
      preparedSpells: preparedSpells.includes(id)
        ? preparedSpells.filter(spellId => spellId !== id)
        : [...preparedSpells, id]
    });
  }

  private saveCharacterUpdates(character: Character, updates: Partial<Character>): void {
    if (this.isSavingChanges()) return;
    this.isSavingChanges.set(true);
    this.persistenceError.set(null);
    this.characterApi.update(character, updates).subscribe({
      next: savedCharacter => {
        this.characterStore.updateCharacterById(character.id, savedCharacter);
        this.isSavingChanges.set(false);
      },
      error: () => {
        this.persistenceError.set('Unable to save spell changes. Please try again.');
        this.isSavingChanges.set(false);
      }
    });
  }

  protected toggleDetails(spell: CharacterCreationOption): void {
    const id = this.getSpellId(spell);
    this.expandedSpellId.update(current => current === id ? null : id);
  }
}
