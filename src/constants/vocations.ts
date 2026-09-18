import { VocationType, CharacterData } from '../types/game';

// Exact Tibia Experience Formula: (50/3) * (L^3 - 6*L^2 + 17*L - 12)
export function getExperienceForLevel(level: number): number {
  if (level <= 1) return 0;
  const l = level;
  return Math.floor((50 / 3) * (Math.pow(l, 3) - 6 * Math.pow(l, 2) + 17 * l - 12));
}

export function getLevelFromExperience(exp: number): number {
  let level = 1;
  while (getExperienceForLevel(level + 1) <= exp) {
    level++;
  }
  return level;
}

export interface VocationConfig {
  name: string;
  promotedName: string;
  description: string;
  baseHp: number;
  baseMana: number;
  baseCap: number;
  hpPerLevel: number;
  manaPerLevel: number;
  capPerLevel: number;
  primaryWeaponType: 'sword' | 'axe' | 'club' | 'distance' | 'magic';
  hpRegenPerTick: number; // HP regenerated per 2 seconds
  manaRegenPerTick: number; // Mana regenerated per 2 seconds
  skillGrowthMultiplier: {
    melee: number;
    distance: number;
    shielding: number;
    magic: number;
  };
  startingSpells: string[];
}

export const VOCATIONS: Record<VocationType, VocationConfig> = {
  KNIGHT: {
    name: 'Knight',
    promotedName: 'Elite Knight',
    description: 'Masters of melee combat and heavy armor. Immense vitality and stalwart defense.',
    baseHp: 185,
    baseMana: 40,
    baseCap: 470,
    hpPerLevel: 15,
    manaPerLevel: 5,
    capPerLevel: 25,
    primaryWeaponType: 'sword',
    hpRegenPerTick: 4,
    manaRegenPerTick: 2,
    skillGrowthMultiplier: {
      melee: 1.1,
      distance: 1.4,
      shielding: 1.1,
      magic: 3.0,
    },
    startingSpells: ['exura_ico', 'exori_ico', 'utevo_lux'],
  },
  PALADIN: {
    name: 'Paladin',
    promotedName: 'Royal Paladin',
    description: 'Sharpshooters who fight from distance with bows and spears, wielding holy light.',
    baseHp: 155,
    baseMana: 60,
    baseCap: 410,
    hpPerLevel: 10,
    manaPerLevel: 15,
    capPerLevel: 20,
    primaryWeaponType: 'distance',
    hpRegenPerTick: 3,
    manaRegenPerTick: 3,
    skillGrowthMultiplier: {
      melee: 1.3,
      distance: 1.1,
      shielding: 1.15,
      magic: 1.4,
    },
    startingSpells: ['exura', 'exori_san', 'utevo_lux'],
  },
  SORCERER: {
    name: 'Sorcerer',
    promotedName: 'Master Sorcerer',
    description: 'Masters of raw destructive energy and roaring flames. High magic damage potential.',
    baseHp: 145,
    baseMana: 90,
    baseCap: 390,
    hpPerLevel: 5,
    manaPerLevel: 30,
    capPerLevel: 10,
    primaryWeaponType: 'magic',
    hpRegenPerTick: 2,
    manaRegenPerTick: 6,
    skillGrowthMultiplier: {
      melee: 2.0,
      distance: 2.0,
      shielding: 1.5,
      magic: 1.1,
    },
    startingSpells: ['exura', 'exori_vis', 'utevo_lux'],
  },
  DRUID: {
    name: 'Druid',
    promotedName: 'Elder Druid',
    description: 'Masters of natural ice and earth magic, endowed with the supreme gift of healing.',
    baseHp: 145,
    baseMana: 90,
    baseCap: 390,
    hpPerLevel: 5,
    manaPerLevel: 30,
    capPerLevel: 10,
    primaryWeaponType: 'magic',
    hpRegenPerTick: 2,
    manaRegenPerTick: 6,
    skillGrowthMultiplier: {
      melee: 2.0,
      distance: 2.0,
      shielding: 1.5,
      magic: 1.1,
    },
    startingSpells: ['exura', 'exori_frigo', 'utevo_lux'],
  },
};

export function createInitialCharacter(name: string, vocation: VocationType): CharacterData {
  const cfg = VOCATIONS[vocation];
  const level = 1;
  const maxHp = cfg.baseHp;
  const maxMana = cfg.baseMana;

  return {
    id: 'char_' + Math.random().toString(36).substring(2, 9),
    name: name.trim() || 'Novice Adventurer',
    vocation,
    promoted: false,
    level,
    experience: 0,
    experienceToNext: getExperienceForLevel(2),
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    capacity: cfg.baseCap,
    gold: 150,
    skills: {
      sword: vocation === 'KNIGHT' ? 18 : 10,
      swordTries: 0,
      axe: vocation === 'KNIGHT' ? 18 : 10,
      axeTries: 0,
      club: vocation === 'KNIGHT' ? 18 : 10,
      clubTries: 0,
      distance: vocation === 'PALADIN' ? 18 : 10,
      distanceTries: 0,
      shielding: vocation === 'KNIGHT' ? 18 : (vocation === 'PALADIN' ? 14 : 10),
      shieldingTries: 0,
      magic: (vocation === 'SORCERER' || vocation === 'DRUID') ? 4 : 0,
      manaSpent: 0,
    },
    equipment: {
      weapon: { instanceId: 'init_wpn', defId: vocation === 'KNIGHT' ? 'sword_iron' : (vocation === 'PALADIN' ? 'bow_wooden' : 'wand_vortex'), count: 1 },
      shield: vocation === 'KNIGHT' ? { instanceId: 'init_shd', defId: 'shield_wooden', count: 1 } : null,
      armor: { instanceId: 'init_arm', defId: 'armor_leather', count: 1 },
      legs: { instanceId: 'init_leg', defId: 'legs_leather', count: 1 },
      boots: { instanceId: 'init_bot', defId: 'boots_leather', count: 1 },
      helmet: null,
      amulet: null,
      ring: null,
      backpack: { instanceId: 'init_bp', defId: 'bp_brown', count: 1 },
    },
    inventory: [
      { instanceId: 'inv_pot_1', defId: 'potion_health', count: 5 },
      { instanceId: 'inv_pot_2', defId: 'potion_mana', count: 5 },
      { instanceId: 'inv_torch', defId: 'val_torch', count: 2 },
    ],
    currentMapId: 'HUB_THAIS',
    lastSavedAt: Date.now(),
    killsCount: 0,
    bossKills: 0,
    highestWaveCompleted: {},
    unlockedSpells: [...cfg.startingSpells],
    bestiaryKills: {},
    runeCharges: {
      rune_sd: 8,
      rune_gfb: 15,
      rune_hmm: 25,
      rune_uh: 12,
    },
    magicLevel: vocation === 'SORCERER' || vocation === 'DRUID' ? 1 : 0,
    magicLevelTries: 0,
  };
}
