/**
 * EffectCatalog.ts
 * Centralized registry of visual effect profiles, particle presets,
 * camera impulses, and atmospheric particle themes for the 3D game engine.
 */

export interface EffectProfile {
  id: string;
  name: string;
  vfxType: string;
  primaryColor: string;
  secondaryColor?: string;
  glowColor?: string;
  durationSeconds: number;
  shakeIntensity?: number;
  shakeDuration?: number;
  hitStopDuration?: number;
  fovPunchAmount?: number;
  particleCount?: number;
  particleScale?: number;
  soundCue?: string;
}

export interface AtmosphereTheme {
  themeId: 'temple' | 'crypt' | 'inferno' | 'void' | 'sewers' | 'default';
  name: string;
  particleColors: string[];
  particleCount: number;
  baseSpeedY: number;
  driftX: number;
  ambientLightColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
}

/**
 * Standard combat visual effect profiles
 */
export const EFFECT_CATALOG: Record<string, EffectProfile> = {
  melee_slash: {
    id: 'melee_slash',
    name: 'Golpe Melee',
    vfxType: 'melee_slash',
    primaryColor: '#fde047',
    secondaryColor: '#f97316',
    durationSeconds: 0.2,
    shakeIntensity: 0.18,
    shakeDuration: 0.15,
    particleCount: 6,
    soundCue: 'sword',
  },
  arrow: {
    id: 'arrow',
    name: 'Disparo de Flecha',
    vfxType: 'arrow',
    primaryColor: '#fef08a',
    secondaryColor: '#84cc16',
    durationSeconds: 0.35,
    shakeIntensity: 0.15,
    shakeDuration: 0.12,
    particleCount: 5,
    soundCue: 'bow',
  },
  magic_fire: {
    id: 'magic_fire',
    name: 'Magia de Fogo / Exori Flam',
    vfxType: 'magic_fire',
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    glowColor: '#ff2200',
    durationSeconds: 0.45,
    shakeIntensity: 0.28,
    shakeDuration: 0.22,
    particleCount: 14,
    soundCue: 'fire',
  },
  magic_ice: {
    id: 'magic_ice',
    name: 'Magia de Gelo / Exori Frigo',
    vfxType: 'magic_ice',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    glowColor: '#bae6fd',
    durationSeconds: 0.5,
    shakeIntensity: 0.22,
    shakeDuration: 0.2,
    particleCount: 16,
    soundCue: 'ice',
  },
  magic_energy: {
    id: 'magic_energy',
    name: 'Magia de Energia / Exori Vis',
    vfxType: 'magic_energy',
    primaryColor: '#c084fc',
    secondaryColor: '#7c3aed',
    glowColor: '#e9d5ff',
    durationSeconds: 0.4,
    shakeIntensity: 0.3,
    shakeDuration: 0.22,
    particleCount: 18,
    soundCue: 'energy',
  },
  magic_holy: {
    id: 'magic_holy',
    name: 'Magia Sagrada / Exori San',
    vfxType: 'magic_holy',
    primaryColor: '#fde047',
    secondaryColor: '#fbbf24',
    glowColor: '#ffffff',
    durationSeconds: 0.55,
    shakeIntensity: 0.25,
    shakeDuration: 0.2,
    particleCount: 20,
    soundCue: 'holy',
  },
  heal_aura: {
    id: 'heal_aura',
    name: 'Aura de Cura / Exura',
    vfxType: 'heal_aura',
    primaryColor: '#34d399',
    secondaryColor: '#10b981',
    glowColor: '#a7f3d0',
    durationSeconds: 0.65,
    particleCount: 18,
    soundCue: 'heal',
  },
  spectral_dash: {
    id: 'spectral_dash',
    name: 'Dash Espectral',
    vfxType: 'spectral_dash',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    glowColor: '#67e8f9',
    durationSeconds: 0.3,
    shakeIntensity: 0.15,
    shakeDuration: 0.12,
    particleCount: 12,
    soundCue: 'dash',
  },
  spell_aoe: {
    id: 'spell_aoe',
    name: 'Impacto em Área / GFB / Mas San',
    vfxType: 'spell_aoe',
    primaryColor: '#f97316',
    secondaryColor: '#fbbf24',
    glowColor: '#ef4444',
    durationSeconds: 0.7,
    shakeIntensity: 0.42,
    shakeDuration: 0.3,
    fovPunchAmount: 2.5,
    particleCount: 28,
  },
  boss_smash: {
    id: 'boss_smash',
    name: 'Golpe Esmagador de Chefe',
    vfxType: 'boss_smash',
    primaryColor: '#ef4444',
    secondaryColor: '#7f1d1d',
    glowColor: '#ff0000',
    durationSeconds: 0.8,
    shakeIntensity: 0.55,
    shakeDuration: 0.35,
    hitStopDuration: 0.08,
    fovPunchAmount: 5.0,
    particleCount: 36,
  },
  crit_hit: {
    id: 'crit_hit',
    name: 'Golpe Crítico',
    vfxType: 'crit_hit',
    primaryColor: '#ff2e2e',
    secondaryColor: '#facc15',
    durationSeconds: 0.45,
    shakeIntensity: 0.35,
    shakeDuration: 0.25,
    hitStopDuration: 0.04,
    fovPunchAmount: 2.0,
    particleCount: 16,
  },
   boss_defeat: {
    id: 'boss_defeat',
    name: 'Vitória sobre Chefe',
    vfxType: 'boss_defeat',
    primaryColor: '#f59e0b',
    secondaryColor: '#fbbf24',
    glowColor: '#ffffff',
    durationSeconds: 1.2,
    shakeIntensity: 0.65,
    shakeDuration: 0.5,
    hitStopDuration: 0.1,
    fovPunchAmount: 6.0,
    particleCount: 50,
  },
   magic_fire_projectile: {
    id: 'magic_fire_projectile',
    name: 'Projétil de Fogo (Exori Flam)',
    vfxType: 'magic_fire_projectile',
    primaryColor: '#ff3700',
    secondaryColor: '#fde047',
    glowColor: '#ffaa00',
    durationSeconds: 0.4,
    shakeIntensity: 0.28,
    shakeDuration: 0.22,
    particleCount: 20,
    soundCue: 'fire',
  },
   magic_ice_projectile: {
    id: 'magic_ice_projectile',
    name: 'Projétil de Gelo (Exori Frigo)',
    vfxType: 'magic_ice_projectile',
    primaryColor: '#7dd3fc',
    secondaryColor: '#0284c7',
    glowColor: '#a5f3fc',
    durationSeconds: 0.35,
    shakeIntensity: 0.22,
    shakeDuration: 0.2,
    particleCount: 18,
    soundCue: 'ice',
  },
   hells_core: {
    id: 'hells_core',
    name: "Hell's Core (Exevo Gran Mas Flam)",
    vfxType: 'hells_core',
    primaryColor: '#ff3b00',
    secondaryColor: '#fef08a',
    glowColor: '#ff7700',
    durationSeconds: 1.05,
    shakeIntensity: 0.6,
    shakeDuration: 0.35,
    fovPunchAmount: 4.5,
    particleCount: 36,
  },
   eternal_winter: {
    id: 'eternal_winter',
    name: 'Eternal Winter (Exevo Gran Mas Frigo)',
    vfxType: 'eternal_winter',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    glowColor: '#0284c7',
    durationSeconds: 1.05,
    shakeIntensity: 0.5,
    shakeDuration: 0.3,
    fovPunchAmount: 4.0,
    particleCount: 32,
    soundCue: 'ice',
  },
};

/**
 * Atmosphere Particle Themes by Map / Dungeon Biome
 */
export const ATMOSPHERE_THEMES: Record<string, AtmosphereTheme> = {
  temple: {
    themeId: 'temple',
    name: 'Templo Sagrado de Thais',
    particleColors: ['#fef08a', '#fde047', '#f472b6', '#fed7aa', '#bae6fd'],
    particleCount: 48,
    baseSpeedY: -0.08, // Petals floating gently downward
    driftX: 0.12,
    ambientLightColor: '#ffffff',
    ambientLightIntensity: 0.85,
    directionalLightColor: '#fef3c7',
  },
  crypt: {
    themeId: 'crypt',
    name: 'Cripta Necrótica',
    particleColors: ['#86efac', '#4ade80', '#22c55e', '#6ee7b7', '#10b981'],
    particleCount: 42,
    baseSpeedY: 0.15, // Murky souls/motes rising
    driftX: 0.04,
    ambientLightColor: '#a7f3d0',
    ambientLightIntensity: 0.65,
    directionalLightColor: '#6ee7b7',
  },
  inferno: {
    themeId: 'inferno',
    name: 'Vórtice Astral / Void',
    particleColors: ['#f97316', '#ef4444', '#facc15', '#b91c1c', '#fb923c'],
    particleCount: 54,
    baseSpeedY: 0.32, // Hot embers rising rapidly
    driftX: 0.08,
    ambientLightColor: '#fed7aa',
    ambientLightIntensity: 0.7,
    directionalLightColor: '#fb923c',
  },
  void: {
    themeId: 'void',
    name: 'Vórtice Astral / Void',
    particleColors: ['#c084fc', '#e879f9', '#38bdf8', '#818cf8', '#a855f7'],
    particleCount: 50,
    baseSpeedY: 0.18,
    driftX: -0.1,
    ambientLightColor: '#e9d5ff',
    ambientLightIntensity: 0.68,
    directionalLightColor: '#c084fc',
  },
  sewers: {
    themeId: 'sewers',
    name: 'Esgotos Subterrâneos',
    particleColors: ['#86efac', '#4ade80', '#22c55e', '#67e8f9', '#a3e635'],
    particleCount: 36,
    baseSpeedY: 0.12,
    driftX: 0.05,
    ambientLightColor: '#dcfce7',
    ambientLightIntensity: 0.72,
    directionalLightColor: '#86efac',
  },
  dragon_lair: {
    themeId: 'inferno',
    name: 'Dragon Lair',
    particleColors: ['#dc2626', '#ea580c', '#f59e0b', '#fbbf24', '#fef08a'],
    particleCount: 60,
    baseSpeedY: 0.38,
    driftX: 0.12,
    ambientLightColor: '#fecaca',
    ambientLightIntensity: 0.75,
    directionalLightColor: '#ef4444',
  },
  tomb: {
    themeId: 'crypt',
    name: 'Ancient Tomb',
    particleColors: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#38bdf8', '#0ea5e9'],
    particleCount: 38,
    baseSpeedY: 0.15,
    driftX: -0.05,
    ambientLightColor: '#e2e8f0',
    ambientLightIntensity: 0.62,
    directionalLightColor: '#94a3b8',
  },
  pirate_cove: {
    themeId: 'sewers',
    name: 'Pirate Cove',
    particleColors: ['#a8884c', '#5c3317', '#92400e', '#ca8a4a', '#fbbf24'],
    particleCount: 34,
    baseSpeedY: 0.2,
    driftX: 0.15,
    ambientLightColor: '#fde68a',
    ambientLightIntensity: 0.78,
    directionalLightColor: '#a8884c',
  },
  default: {
    themeId: 'default',
    name: 'Caverna Padrão',
    particleColors: ['#fdba74', '#fb923c', '#f87171', '#c084fc', '#facc15'],
    particleCount: 40,
    baseSpeedY: 0.14,
    driftX: 0.02,
    ambientLightColor: '#ffffff',
    ambientLightIntensity: 0.75,
    directionalLightColor: '#ffffff',
  },
};

/**
 * Helper to get the atmosphere theme for a given map ID or dungeon biome
 */
export function getAtmosphereTheme(mapId: string, biome?: string): AtmosphereTheme {
  if (mapId === 'HUB_THAIS') return ATMOSPHERE_THEMES.temple;
  if (mapId === 'HUNT_SEWERS') return ATMOSPHERE_THEMES.sewers;

  if (biome) {
    const lower = biome.toLowerCase();
    if (lower.includes('crypt') || lower.includes('undead') || lower.includes('necro') || lower.includes('tomb')) return ATMOSPHERE_THEMES.crypt;
    if (lower.includes('inferno') || lower.includes('fire') || lower.includes('dragon')) return ATMOSPHERE_THEMES.inferno;
    if (lower.includes('void') || lower.includes('astral') || lower.includes('demon')) return ATMOSPHERE_THEMES.void;
    if (lower.includes('pirate')) return ATMOSPHERE_THEMES.pirate_cove;
  }

  if (mapId.includes('DRAGON') || mapId.includes('DEMON')) return ATMOSPHERE_THEMES.inferno;
  if (mapId.includes('TOMB') || mapId.includes('GHOST')) return ATMOSPHERE_THEMES.crypt;
  if (mapId.includes('PIRATE')) return ATMOSPHERE_THEMES.pirate_cove;

  return ATMOSPHERE_THEMES.default;
}

/**
 * Extended atmosphere theme helper with additional map types
 */
export function getAtmosphereThemeExtended(mapId: string, biome?: string): AtmosphereTheme {
  if (mapId === 'HUB_THAIS') return ATMOSPHERE_THEMES.temple;
  if (mapId === 'HUNT_SEWERS') return ATMOSPHERE_THEMES.sewers;

  if (biome) {
    const lower = biome.toLowerCase();
    if (lower.includes('crypt') || lower.includes('undead') || lower.includes('necro') || lower.includes('tomb')) return ATMOSPHERE_THEMES.crypt;
    if (lower.includes('inferno') || lower.includes('fire') || lower.includes('dragon')) return ATMOSPHERE_THEMES.inferno;
    if (lower.includes('void') || lower.includes('astral') || lower.includes('demon')) return ATMOSPHERE_THEMES.void;
    if (lower.includes('pirate')) return ATMOSPHERE_THEMES.pirate_cove;
  }

  if (mapId.includes('DRAGON') || mapId.includes('DEMON')) return ATMOSPHERE_THEMES.inferno;
  if (mapId.includes('TOMB') || mapId.includes('GHOST')) return ATMOSPHERE_THEMES.crypt;
  if (mapId.includes('PIRATE')) return ATMOSPHERE_THEMES.pirate_cove;

  return ATMOSPHERE_THEMES.default;
}
