export interface ClassArchetype {
  name: string;
  slug: string;
  desc: string;
  document__slug?: string;
  document__title?: string;
  document__license_url?: string;
  document__url?: string;
}

export interface ClassData {
  name: string;
  slug: string;
  desc: string;
  hit_dice: string;
  hp_at_1st_level: string;
  hp_at_higher_levels: string;
  prof_armor: string;
  prof_weapons: string;
  prof_tools: string;
  prof_saving_throws: string;
  prof_skills: string;
  equipment: string;
  table: string;
  spellcasting_ability: string;
  subtypes_name?: string;
  archetypes?: ClassArchetype[];
  saving_throws?: string[];
  skill_proficiencies?: string[];
  armor_proficiencies?: string[];
  weapon_proficiencies?: string[];
  features?: { name: string; level?: number; description?: string }[];
  subclasses?: {
    name: string;
    description?: string;
    features?: { name: string; level?: number; description?: string }[];
  }[];
}

export interface CharacterCreationOption extends Partial<ClassData> {
  [key: string]: unknown;
  name: string;
  slug?: string;
  description?: string;
  spellcasting_ability?: string;
}

export interface Character {
  id: string;
  name: string;
  conditions?: [];
  race: string;
  class: string;
  classData?: ClassData;
  background: string;
  alignment: string;
  experiencePoints?: number;
  level: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  knownSpells?: string[];
  preparedSpells?: string[];
}
