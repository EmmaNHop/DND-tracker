import { computed, signal, WritableSignal, Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCreationStore } from './characterCreation.store';
import { CharacterDashboardComponent } from './characterDashboard.component';
import { Character } from './character.types';
import { AuthService } from '../../services/auth.service';
import { CharacterApiService } from '../../services/character-api.service';
import { of } from 'rxjs';

describe('CharacterDashboardComponent', () => {
  let fixture: ComponentFixture<CharacterDashboardComponent>;
  let currentCharacter: WritableSignal<Partial<Character> | null>;
  const currentUser = signal({ id: 'user-id', email: 'player@example.com' });
  let characterStore: {
    currentCharacter: WritableSignal<Partial<Character> | null>;
    characters: WritableSignal<Character[]>;
    isCharacterValid: Signal<boolean>;
    isLoading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    races: WritableSignal<never[]>;
    classes: WritableSignal<never[]>;
    backgrounds: WritableSignal<never[]>;
    initializeCharacter: jasmine.Spy;
    updateCharacter: jasmine.Spy;
    addCharacter: jasmine.Spy;
    setCharacters: jasmine.Spy;
    loadAllData: jasmine.Spy;
    resetCharacter: jasmine.Spy;
  };

  beforeEach(async () => {
    currentCharacter = signal<Partial<Character> | null>(null);
    characterStore = {
      currentCharacter,
      characters: signal<Character[]>([]),
      isCharacterValid: computed(() => {
        const character = currentCharacter();
        return Boolean(character?.name && character.race && character.class && character.background);
      }),
      isLoading: signal(false),
      error: signal<string | null>(null),
      races: signal([]),
      classes: signal([]),
      backgrounds: signal([]),
      initializeCharacter: jasmine.createSpy().and.callFake(() => {
        currentCharacter.set({
          name: '',
          race: '',
          class: '',
          background: '',
          alignment: 'Neutral',
          level: 1,
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10
        });
      }),
      updateCharacter: jasmine.createSpy().and.callFake((updates: Partial<Character>) => {
        currentCharacter.update(character => ({ ...character, ...updates }));
      }),
      addCharacter: jasmine.createSpy(),
      setCharacters: jasmine.createSpy(),
      loadAllData: jasmine.createSpy(),
      resetCharacter: jasmine.createSpy().and.callFake(() => currentCharacter.set(null))
    };

    await TestBed.configureTestingModule({
      imports: [CharacterDashboardComponent],
      providers: [
        { provide: CharacterCreationStore, useValue: characterStore },
        {
          provide: AuthService,
          useValue: {
            currentUser,
            restoreSession: () => of(currentUser()),
            login: jasmine.createSpy(),
            register: jasmine.createSpy(),
            logout: jasmine.createSpy()
          }
        },
        {
          provide: CharacterApiService,
          useValue: { list: () => of([]), create: jasmine.createSpy() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterDashboardComponent);
    fixture.detectChanges();
  });

  it('creates the dashboard', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts a draft and loads the creation options', () => {
    const beginButton = fixture.nativeElement.querySelector('.create-prompt button') as HTMLButtonElement;
    beginButton.click();
    fixture.detectChanges();

    expect(characterStore.initializeCharacter).toHaveBeenCalled();
    expect(characterStore.loadAllData).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Step 1 of 6');
  });
});
