import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { CharacterCreationStore } from './characterCreation.store';
import { Character, CharacterCreationOption } from './character.types';
import { AuthService } from '../../services/auth.service';
import { CharacterApiService } from '../../services/character-api.service';

type AbilityScoreName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

interface OptionDetail {
  label: string;
  value: string;
}

@Component({
  selector: 'app-character-dashboard',
  templateUrl: './characterDashboard.component.html',
  styleUrl: './characterDashboard.component.scss',
  imports: [CommonModule, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharacterDashboardComponent implements OnInit {
  protected readonly characterStore = inject(CharacterCreationStore);
  protected readonly authService = inject(AuthService);
  private readonly characterApi = inject(CharacterApiService);
  private readonly location = inject(Location);
  protected readonly isCreatingCharacter = signal(false);
  protected readonly authMode = signal<'login' | 'register'>('login');
  protected readonly authError = signal<string | null>(null);
  protected readonly characterError = signal<string | null>(null);
  protected readonly isSavingCharacter = signal(false);
  protected readonly isLoadingCharacters = signal(false);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly currentStep = signal(0);
  protected readonly steps = ['Identity', 'Race', 'Class', 'Background', 'Details', 'Review'];
  protected readonly alignments = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
  ];
  protected readonly abilityScores: { key: AbilityScoreName; label: string }[] = [
    { key: 'strength', label: 'Strength' },
    { key: 'dexterity', label: 'Dexterity' },
    { key: 'constitution', label: 'Constitution' },
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'wisdom', label: 'Wisdom' },
    { key: 'charisma', label: 'Charisma' }
  ];
  protected readonly canContinue = computed(() => {
    const character = this.characterStore.currentCharacter();
    if (!character) {
      return false;
    }

    switch (this.currentStep()) {
      case 0:
        return Boolean(character.name?.trim());
      case 1:
        return Boolean(character.race);
      case 2:
        return Boolean(character.class);
      case 3:
        return Boolean(character.background);
      case 4:
        return Boolean(character.alignment);
      default:
        return this.characterStore.isCharacterValid();
    }
  });
  protected readonly currentUser = this.authService.currentUser;

  ngOnInit(): void {
    this.authService.restoreSession().subscribe({
      next: user => {
        if (user) this.loadCharacters();
      },
      error: () => {
        this.authError.set('Your session has expired. Please sign in again.');
      }
    });
  }

  protected submitAuth(event: Event): void {
    event.preventDefault();
    this.authError.set(null);
    const request = this.authMode() === 'register'
      ? this.authService.register(this.email(), this.password())
      : this.authService.login(this.email(), this.password());
    request.subscribe({
      next: () => {
        this.password.set('');
        this.loadCharacters();
      },
      error: error => this.authError.set(error.error?.error ?? 'Unable to authenticate. Please try again.')
    });
  }

  protected logout(): void {
    this.authService.logout();
    this.characterStore.setCharacters([]);
    this.characterStore.resetCharacter();
    this.isCreatingCharacter.set(false);
  }

  private loadCharacters(): void {
    this.isLoadingCharacters.set(true);
    this.characterError.set(null);
    this.characterApi.list().subscribe({
      next: characters => {
        this.characterStore.setCharacters(characters);
        this.isLoadingCharacters.set(false);
      },
      error: () => {
        this.characterError.set('Unable to load your saved characters.');
        this.isLoadingCharacters.set(false);
      }
    });
  }
  protected readonly selectedRace = computed(() => {
    const race = this.characterStore.currentCharacter()?.race;
    return this.characterStore.races().find(option => option.name === race);
  });
  protected readonly selectedClass = computed(() => {
    const className = this.characterStore.currentCharacter()?.class;
    return this.characterStore.classes().find(option => option.name === className);
  });
  protected readonly selectedBackground = computed(() => {
    const background = this.characterStore.currentCharacter()?.background;
    return this.characterStore.backgrounds().find(option => option.name === background);
  });
  private readonly detailFields: Record<string, string> = {
    asi_desc: 'Ability score increases',
    age: 'Age',
    alignment: 'Alignment',
    size: 'Size',
    size_description: 'Size',
    speed: 'Speed',
    speed_desc: 'Speed',
    vision: 'Vision',
    languages: 'Languages',
    traits: 'Traits',
    hit_dice: 'Hit die',
    hp_at_1st_level: 'Hit points at level 1',
    hp_at_higher_levels: 'Hit points at higher levels',
    prof_armor: 'Armor proficiencies',
    prof_weapons: 'Weapon proficiencies',
    prof_tools: 'Tool proficiencies',
    prof_saving_throws: 'Saving throw proficiencies',
    prof_skills: 'Skill proficiencies',
    skill_proficiencies: 'Skill proficiencies',
    tool_proficiencies: 'Tool proficiencies',
    armor_proficiencies: 'Armor proficiencies',
    weapon_proficiencies: 'Weapon proficiencies',
    equipment: 'Starting equipment',
    spellcasting_ability: 'Spellcasting ability',
    feature: 'Background feature',
    features: 'Features',
    archetypes: 'Archetypes',
    subclasses: 'Subclasses',
    personality_traits: 'Personality traits',
    ideals: 'Ideals',
    bonds: 'Bonds',
    flaws: 'Flaws',
    suggested_characteristics: 'Suggested characteristics'
  };

  protected beginCharacterCreation(): void {
    if (!this.characterStore.currentCharacter()) {
      this.characterStore.initializeCharacter();
    }
    this.currentStep.set(0);
    this.isCreatingCharacter.set(true);
    this.characterStore.loadAllData();
  }

  protected retryLoadData(): void {
    this.characterStore.loadAllData();
  }

  protected updateName(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.characterStore.updateCharacter({ name: event.target.value });
    }
  }

  protected selectRace(option: CharacterCreationOption): void {
    this.characterStore.updateCharacter({ race: option.name });
  }

  protected selectClass(option: CharacterCreationOption): void {
    this.characterStore.updateCharacter({ class: option.name });
  }

  protected selectBackground(option: CharacterCreationOption): void {
    this.characterStore.updateCharacter({ background: option.name });
  }

  protected getOptionDetails(option: CharacterCreationOption | undefined): OptionDetail[] {
    if (!option) {
      return [];
    }

    const details: OptionDetail[] = [];
    const description = this.formatOptionValue(option['desc'] ?? option['description']);
    if (description) {
      details.push({ label: 'Description', value: description });
    }

    for (const [key, label] of Object.entries(this.detailFields)) {
      const value = this.formatOptionValue(option[key]);
      if (value) {
        details.push({ label, value });
      }
    }
    return details;
  }

  private formatOptionValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map(item => this.formatOptionValue(item)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([key, item]) => {
          const formatted = this.formatOptionValue(item);
          return formatted ? `${key.replace(/_/g, ' ')}: ${formatted}` : '';
        })
        .filter(Boolean)
        .join('; ');
    }
    return '';
  }

  protected selectAlignment(alignment: string): void {
    this.characterStore.updateCharacter({ alignment });
  }

  protected updateAbilityScore(ability: AbilityScoreName, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const input = event.target;
    const score = Number(input.value);
    if (Number.isInteger(score) && score >= 3 && score <= 18) {
      this.characterStore.updateCharacter({ [ability]: score });
    } else {
      input.value = String(this.characterStore.currentCharacter()?.[ability] ?? 10);
    }
  }

  protected nextStep(): void {
    if (this.canContinue() && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(step => step + 1);
    }
  }

  protected previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(step => step - 1);
    }
  }

  protected cancelCreation(): void {
    this.characterStore.resetCharacter();
    this.currentStep.set(0);
    this.isCreatingCharacter.set(false);
  }

  protected completeCreation(): void {
    const draft = this.characterStore.currentCharacter();
    if (
      !draft ||
      !draft.name?.trim() ||
      !draft.race ||
      !draft.class ||
      !draft.background ||
      !this.characterStore.isCharacterValid()
    ) {
      return;
    }

    const character: Omit<Character, 'id'> = {
      name: draft.name.trim(),
      race: draft.race,
      class: draft.class,
      background: draft.background,
      alignment: draft.alignment || 'Neutral',
      level: draft.level || 1,
      experiencePoints: draft.experiencePoints || 0,
      strength: draft.strength ?? 10,
      dexterity: draft.dexterity ?? 10,
      constitution: draft.constitution ?? 10,
      intelligence: draft.intelligence ?? 10,
      wisdom: draft.wisdom ?? 10,
      charisma: draft.charisma ?? 10
    };

    this.isSavingCharacter.set(true);
    this.characterError.set(null);
    this.characterApi.create(character).subscribe({
      next: savedCharacter => {
        this.characterStore.addCharacter(savedCharacter);
        this.characterStore.resetCharacter();
        this.currentStep.set(0);
        this.isCreatingCharacter.set(false);
        this.isSavingCharacter.set(false);
      },
      error: () => {
        this.characterError.set('Unable to save your character. Please try again.');
        this.isSavingCharacter.set(false);
      }
    });
  }

  protected readonly stepHeading = computed(() => this.steps[this.currentStep()]);

  protected back(): void {
    this.location.back();
  }
}
