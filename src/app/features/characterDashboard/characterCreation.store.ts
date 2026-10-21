import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { Character, CharacterCreationOption, ClassData } from './character.types';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';

interface CharacterCreationState {
  characters: Character[];
  currentCharacter: Partial<Character> | null;
  races: CharacterCreationOption[];
  classes: CharacterCreationOption[];
  classDetails: Map<string, ClassData>;
  backgrounds: CharacterCreationOption[];
  feats: CharacterCreationOption[];
  spells: CharacterCreationOption[];
  weapons: CharacterCreationOption[];
  armor: CharacterCreationOption[];
  isLoading: boolean;
  error: string | null;
  spellsLoading: boolean;
  spellsError: string | null;
}

function normalizeOptions(response: unknown): CharacterCreationOption[] {
  const results = Array.isArray(response)
    ? response
    : typeof response === 'object' && response !== null && 'results' in response
      ? response.results
      : [];

  if (!Array.isArray(results)) {
    return [];
  }

  return results.filter((item): item is Record<string, unknown> & { name: string } =>
    typeof item === 'object' && item !== null && typeof item['name'] === 'string'
  ).map(item => ({
    ...item,
    name: item.name,
    ...(typeof item['slug'] === 'string' ? { slug: item['slug'] } : {}),
    ...(typeof item['desc'] === 'string' ? { desc: item['desc'] } : {}),
    ...(typeof item['description'] === 'string' ? { description: item['description'] } : {})
  }) as CharacterCreationOption);
}

const initialState: CharacterCreationState = {
  characters: [],
  currentCharacter: null,
  races: [],
  classes: [],
  classDetails: new Map(),
  backgrounds: [],
  feats: [],
  spells: [],
  weapons: [],
  armor: [],
  isLoading: false,
  error: null,
  spellsLoading: false,
  spellsError: null
};

export const CharacterCreationStore = signalStore(
  withState(initialState),
  withComputed(({ races, classes, backgrounds, feats, spells, weapons, armor, currentCharacter }) => ({
    hasRaces: computed(() => races().length > 0),
    hasClasses: computed(() => classes().length > 0),
    hasBackgrounds: computed(() => backgrounds().length > 0),
    hasFeats: computed(() => feats().length > 0),
    hasSpells: computed(() => spells().length > 0),
    hasWeapons: computed(() => weapons().length > 0),
    hasArmor: computed(() => armor().length > 0),
    isCharacterValid: computed(() => {
      const char = currentCharacter();
      return Boolean(char?.name?.trim() && char?.race && char?.class && char?.background);
    })
  })),
  withMethods((store) => {
    const apiService = inject(ApiService);

    return {
      // Initialize character with default values
      initializeCharacter: (character?: Partial<Character>) => {
        patchState(store, {
          currentCharacter: character || {
            name: '',
            race: '',
            class: '',
            background: '',
            alignment: 'Neutral',
            level: 1,
            experiencePoints: 0,
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
          },
          error: null
        });
      },

      // Update character data
      updateCharacter: (updates: Partial<Character>) => {
        patchState(store, {
          currentCharacter: { ...store.currentCharacter(), ...updates }
        });
      },

      addCharacter: (character: Character) => {
        patchState(store, { characters: [...store.characters(), character] });
      },

      setCharacters: (characters: Character[]) => {
        patchState(store, { characters });
      },

      updateCharacterById: (characterId: string, updates: Partial<Character>) => {
        patchState(store, {
          characters: store.characters().map(character =>
            character.id === characterId ? { ...character, ...updates } : character
          )
        });
      },

      // Load races from API
      loadRaces: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getRaces().subscribe({
          next: (data) => {
            patchState(store, { races: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load races',
              isLoading: false
            });
          }
        });
      },

      // Load classes from API
      loadClasses: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getClasses().subscribe({
          next: (data) => {
            patchState(store, { classes: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load classes',
              isLoading: false
            });
          }
        });
      },

      // Load backgrounds from API
      loadBackgrounds: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getBackgrounds().subscribe({
          next: (data) => {
            patchState(store, { backgrounds: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load backgrounds',
              isLoading: false
            });
          }
        });
      },

      // Load feats from API
      loadFeats: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getFeats().subscribe({
          next: (data) => {
            patchState(store, { feats: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load feats',
              isLoading: false
            });
          }
        });
      },

      // Load spells from API
      loadSpells: () => {
        patchState(store, { spellsLoading: true, spellsError: null });
        apiService.getSpells().subscribe({
          next: (data) => {
            patchState(store, { spells: normalizeOptions(data), spellsLoading: false });
          },
          error: () => {
            patchState(store, {
              spellsError: 'Failed to load spells. Please try again.',
              spellsLoading: false
            });
          }
        });
      },

      // Load weapons from API
      loadWeapons: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getWeapons().subscribe({
          next: (data) => {
            patchState(store, { weapons: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load weapons',
              isLoading: false
            });
          }
        });
      },

      // Load armor from API
      loadArmor: () => {
        patchState(store, { isLoading: true, error: null });
        apiService.getArmor().subscribe({
          next: (data) => {
            patchState(store, { armor: normalizeOptions(data), isLoading: false });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load armor',
              isLoading: false
            });
          }
        });
      },

      // Load all character creation data at once
      loadAllData: () => {
        patchState(store, { isLoading: true, error: null });
        forkJoin({
          races: apiService.getRaces(),
          classes: apiService.getClasses(),
          backgrounds: apiService.getBackgrounds(),
          feats: apiService.getFeats()
        }).subscribe({
          next: ({ races, classes, backgrounds, feats }) => {
            patchState(store, {
              races: normalizeOptions(races),
              classes: normalizeOptions(classes),
              backgrounds: normalizeOptions(backgrounds),
              feats: normalizeOptions(feats),
              isLoading: false
            });
          },
          error: () => {
            patchState(store, {
              error: 'Failed to load character creation options. Please try again.',
              isLoading: false
            });
          }
        });
      },

      // Reset character creation
      resetCharacter: () => {
        patchState(store, {
          currentCharacter: null,
          error: null
        });
      },

      // Clear error
      clearError: () => {
        patchState(store, { error: null });
      },

      // Store detailed class data
      storeClassDetails: (classSlug: string, classData: ClassData) => {
        const updated = new Map(store.classDetails());
        updated.set(classSlug, classData);
        patchState(store, { classDetails: updated });
      },

      // Store multiple class details at once
      storeMultipleClassDetails: (classDataArray: ClassData[]) => {
        const updated = new Map(store.classDetails());
        classDataArray.forEach(classData => {
          updated.set(classData.slug, classData);
        });
        patchState(store, { classDetails: updated });
      },

      // Get class details by slug
      getClassDetails: (classSlug: string): ClassData | undefined => {
        return store.classDetails().get(classSlug);
      },

      // Clear all API cache
      clearApiCache: () => {
        apiService.clearAllCache();
        patchState(store, { error: null });
      },

      // Clear specific cache key
      clearCacheForKey: (cacheKey: string) => {
        apiService.clearCacheForKey(cacheKey);
      },

      // Get cache statistics
      getCacheStats: () => {
        return apiService.getCacheStats();
      }
    };
  })
);
