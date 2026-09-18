import { MONSTERS_DATABASE } from './monsters';

export interface BestiaryMonsterInfo {
  id: string;
  name: string;
  family: 'Rodent' | 'Worm' | 'Undead' | 'Giant' | 'Humanoid' | 'Dragon' | 'Demon' | 'Boss';
  huntMapId: string;
  huntMapName: string;
  description: string;
  weakness: string;
  modelType: string;
  color: string;
  tierRequirements: {
    tier1: number; // Reveals stats & +3% damage
    tier2: number; // Reveals loot rates & +3% loot find
    tier3: number; // Full mastery: +7% damage & +4% crit
  };
}

export const BESTIARY_DATABASE: Record<string, BestiaryMonsterInfo> = {
  cave_rat: {
    id: 'cave_rat',
    name: 'Cave Rat',
    family: 'Rodent',
    huntMapId: 'HUNT_SEWERS',
    huntMapName: 'Sewers of Thais',
    description: 'Ratos cavernosos infestados que se proliferam nos esgotos úmidos. São ágeis e atacam em bandos.',
    weakness: 'Físico / Fogo',
    modelType: 'cave_rat',
    color: '#78350f',
    tierRequirements: { tier1: 8, tier2: 25, tier3: 60 },
  },
  rotworm: {
    id: 'rotworm',
    name: 'Rotworm',
    family: 'Worm',
    huntMapId: 'HUNT_SEWERS',
    huntMapName: 'Sewers of Thais',
    description: 'Criaturas subterrâneas anelídeas clássicas que devoram carne em decomposição. Possuem dentes afiados concêntricos.',
    weakness: 'Físico / Gelo',
    modelType: 'rotworm',
    color: '#b45309',
    tierRequirements: { tier1: 12, tier2: 40, tier3: 100 },
  },
  carrion_worm: {
    id: 'carrion_worm',
    name: 'Carrion Worm',
    family: 'Worm',
    huntMapId: 'HUNT_SEWERS',
    huntMapName: 'Sewers of Thais',
    description: 'Uma evolução perigosa dos vermes comuns. Carapaça mais espessa e capacidade de secretar ácidos tóxicos.',
    weakness: 'Gelo / Energia',
    modelType: 'carrion_worm',
    color: '#92400e',
    tierRequirements: { tier1: 10, tier2: 30, tier3: 80 },
  },
  rotworm_queen: {
    id: 'rotworm_queen',
    name: 'Rotworm Queen',
    family: 'Boss',
    huntMapId: 'HUNT_SEWERS',
    huntMapName: 'Sewers of Thais',
    description: 'A colossal matriarca dos esgotos. Comanda as ninhadas e espalha tremores de terra e poças de ácido letal.',
    weakness: 'Fogo / Energia',
    modelType: 'rotworm_queen',
    color: '#d97706',
    tierRequirements: { tier1: 2, tier2: 5, tier3: 12 },
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton Warrior',
    family: 'Undead',
    huntMapId: 'HUNT_RUINS',
    huntMapName: 'Mount Sternum Ruins',
    description: 'Guerreiros esquálidos reanimados por magia profana nas ruínas antigas de Sternum. Portam espadas enferrujadas.',
    weakness: 'Sagrado / Fogo',
    modelType: 'skeleton',
    color: '#e2e8f0',
    tierRequirements: { tier1: 12, tier2: 35, tier3: 90 },
  },
  cyclops: {
    id: 'cyclops',
    name: 'Cyclops',
    family: 'Giant',
    huntMapId: 'HUNT_RUINS',
    huntMapName: 'Mount Sternum Ruins',
    description: 'Gigantes brutais de um olho só. Arremessam pedregulhos pesados e possuem força física esmagadora.',
    weakness: 'Morte / Energia',
    modelType: 'cyclops',
    color: '#f87171',
    tierRequirements: { tier1: 15, tier2: 45, tier3: 110 },
  },
  cyclops_smith: {
    id: 'cyclops_smith',
    name: 'Cyclops Smith',
    family: 'Boss',
    huntMapId: 'HUNT_RUINS',
    huntMapName: 'Mount Sternum Ruins',
    description: 'O mestre forjador dos ciclopes. Empunha uma marreta incandescente capaz de criar campos ardentes no chão.',
    weakness: 'Gelo / Sagrado',
    modelType: 'cyclops_smith',
    color: '#ef4444',
    tierRequirements: { tier1: 2, tier2: 5, tier3: 12 },
  },
  pirate_cutthroat: {
    id: 'pirate_cutthroat',
    name: 'Pirate Cutthroat',
    family: 'Humanoid',
    huntMapId: 'HUNT_PIRATE_COVE',
    huntMapName: 'Liberty Bay Pirate Cove',
    description: 'Bucaneiros cruéis armados com adagas e alfanjes, rápidos para cercar exploradores desprevenidos.',
    weakness: 'Físico / Energia',
    modelType: 'pirate',
    color: '#0284c7',
    tierRequirements: { tier1: 15, tier2: 40, tier3: 100 },
  },
  pirate_corsair: {
    id: 'pirate_corsair',
    name: 'Pirate Corsair',
    family: 'Humanoid',
    huntMapId: 'HUNT_PIRATE_COVE',
    huntMapName: 'Liberty Bay Pirate Cove',
    description: 'Atiradores experientes da frota pirata armada, peritos em disparos de bacamarte a distância.',
    weakness: 'Fogo / Físico',
    modelType: 'pirate',
    color: '#0369a1',
    tierRequirements: { tier1: 15, tier2: 45, tier3: 110 },
  },
  pirate_captain: {
    id: 'pirate_captain',
    name: 'Capitão Barba-Rubra',
    family: 'Boss',
    huntMapId: 'HUNT_PIRATE_COVE',
    huntMapName: 'Liberty Bay Pirate Cove',
    description: 'Comandante da frota dos mares do sul. Convoca salvas de canhão devastadoras em área.',
    weakness: 'Energia / Sagrado',
    modelType: 'pirate_captain',
    color: '#e11d48',
    tierRequirements: { tier1: 2, tier2: 5, tier3: 12 },
  },
  dragon_hatchling: {
    id: 'dragon_hatchling',
    name: 'Dragon Hatchling',
    family: 'Dragon',
    huntMapId: 'HUNT_DRAGON_LAIR',
    huntMapName: 'Ankrahmun Dragon Lair',
    description: 'Jovens dragões répteis com asas curtas. Apesar do tamanho menor, cospem bolas de fogo abrasadoras.',
    weakness: 'Gelo / Físico',
    modelType: 'dragon',
    color: '#16a34a',
    tierRequirements: { tier1: 15, tier2: 45, tier3: 120 },
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    family: 'Dragon',
    huntMapId: 'HUNT_DRAGON_LAIR',
    huntMapName: 'Ankrahmun Dragon Lair',
    description: 'O monstro mítico supremo das cavernas. Despeja ondas de fogo flamejantes e garras afiadas.',
    weakness: 'Gelo',
    modelType: 'dragon',
    color: '#15803d',
    tierRequirements: { tier1: 20, tier2: 60, tier3: 150 },
  },
  dragon_lord: {
    id: 'dragon_lord',
    name: 'Dragon Lord',
    family: 'Boss',
    huntMapId: 'HUNT_DRAGON_LAIR',
    huntMapName: 'Ankrahmun Dragon Lair',
    description: 'Soberano das escamas vermelhas ardentes. Seus rugidos ecoam pelas profundezas incendiando os invasores.',
    weakness: 'Gelo / Sagrado',
    modelType: 'dragon_lord',
    color: '#dc2626',
    tierRequirements: { tier1: 2, tier2: 6, tier3: 15 },
  },
  priestess: {
    id: 'priestess',
    name: 'Priestess',
    family: 'Humanoid',
    huntMapId: 'HUNT_HERO_CAVE',
    huntMapName: 'Edron Hero Sanctuary',
    description: 'Sacerdotisas renegadas cultistas que lançam feitiços de maldição e hinos sombrios.',
    weakness: 'Físico / Sagrado',
    modelType: 'hero',
    color: '#a855f7',
    tierRequirements: { tier1: 15, tier2: 45, tier3: 120 },
  },
  black_knight: {
    id: 'black_knight',
    name: 'Black Knight',
    family: 'Humanoid',
    huntMapId: 'HUNT_HERO_CAVE',
    huntMapName: 'Edron Hero Sanctuary',
    description: 'Cavaleiro corrompido em armadura negra impenetrável. Desfere cortes mortais.',
    weakness: 'Sagrado / Fogo',
    modelType: 'black_knight',
    color: '#18181b',
    tierRequirements: { tier1: 20, tier2: 60, tier3: 150 },
  },
  hero_champion: {
    id: 'hero_champion',
    name: 'Hero Champion',
    family: 'Boss',
    huntMapId: 'HUNT_HERO_CAVE',
    huntMapName: 'Edron Hero Sanctuary',
    description: 'Guerreiro lendário abençoado pela coroa de ouro. Domina o Exori Gran e flechas divinas.',
    weakness: 'Morte / Gelo',
    modelType: 'hero_champion',
    color: '#f59e0b',
    tierRequirements: { tier1: 2, tier2: 6, tier3: 15 },
  },
  fire_devil: {
    id: 'fire_devil',
    name: 'Fire Devil',
    family: 'Demon',
    huntMapId: 'HUNT_DEMON_HELL',
    huntMapName: 'Goroma Demon Forge & Hell',
    description: 'Espíritos flamejantes infernais rápidos que invocam campos de labaredas.',
    weakness: 'Gelo / Sagrado',
    modelType: 'demon',
    color: '#ea580c',
    tierRequirements: { tier1: 20, tier2: 60, tier3: 150 },
  },
  behemoth: {
    id: 'behemoth',
    name: 'Behemoth',
    family: 'Giant',
    huntMapId: 'HUNT_DEMON_HELL',
    huntMapName: 'Goroma Demon Forge & Hell',
    description: 'Monólitos titânicos de músculos e chifres de marfim. Esmagam o chão gerando ondas de choque.',
    weakness: 'Morte / Energia',
    modelType: 'behemoth',
    color: '#713f12',
    tierRequirements: { tier1: 25, tier2: 75, tier3: 180 },
  },
  demon_overlord: {
    id: 'demon_overlord',
    name: 'Demon Overlord',
    family: 'Boss',
    huntMapId: 'HUNT_DEMON_HELL',
    huntMapName: 'Goroma Demon Forge & Hell',
    description: 'O arquidônio supremo das chamas eternas de Tibia. Invoca o Apocalipse de meteoros e feixes de energia pura.',
    weakness: 'Gelo / Sagrado',
    modelType: 'demon_overlord',
    color: '#b91c1c',
    tierRequirements: { tier1: 3, tier2: 8, tier3: 20 },
  },
};


export function getMonsterBestiaryTier(monsterId: string, kills: number): 0 | 1 | 2 | 3 {
  const info = BESTIARY_DATABASE[monsterId];
  if (!info) return 0;
  if (kills >= info.tierRequirements.tier3) return 3;
  if (kills >= info.tierRequirements.tier2) return 2;
  if (kills >= info.tierRequirements.tier1) return 1;
  return 0;
}

export function getMonsterBestiaryBonuses(monsterId: string, kills: number): {
  damageBonusPct: number;
  lootBonusPct: number;
  critBonusPct: number;
} {
  const tier = getMonsterBestiaryTier(monsterId, kills);
  if (tier === 3) {
    return { damageBonusPct: 10, lootBonusPct: 3, critBonusPct: 4 };
  } else if (tier === 2) {
    return { damageBonusPct: 3, lootBonusPct: 3, critBonusPct: 0 };
  } else if (tier === 1) {
    return { damageBonusPct: 3, lootBonusPct: 0, critBonusPct: 0 };
  }
  return { damageBonusPct: 0, lootBonusPct: 0, critBonusPct: 0 };
}

export function calculateMonsterBestiaryBonus(monsterId: string, kills: number): {
  damageBonus: number;
  lootBonus: number;
  critChanceBonus: number;
} {
  const b = getMonsterBestiaryBonuses(monsterId, kills);
  return {
    damageBonus: b.damageBonusPct / 100,
    lootBonus: b.lootBonusPct / 100,
    critChanceBonus: b.critBonusPct / 100,
  };
}
