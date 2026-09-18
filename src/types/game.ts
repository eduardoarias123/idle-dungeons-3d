// Shared Game Types & Protocol for Tibia Dungeons 3D MMORPG-Idle

export type VocationType = 'KNIGHT' | 'PALADIN' | 'SORCERER' | 'DRUID';

export type CombatStance = 'full_attack' | 'balanced' | 'full_defense';

export type SkillType = 'sword' | 'axe' | 'club' | 'distance' | 'shielding' | 'magic';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'unique';

export type EquipmentSlot = 
  | 'helmet' 
  | 'armor' 
  | 'legs' 
  | 'boots' 
  | 'weapon' 
  | 'shield' 
  | 'amulet' 
  | 'ring' 
  | 'backpack';

export interface ItemDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  type: 'weapon' | 'shield' | 'armor' | 'helmet' | 'legs' | 'boots' | 'potion' | 'amulet' | 'ring' | 'valuable';
  slot?: EquipmentSlot;
  icon: string;
  iconPath?: string;
  attack?: number;
  defense?: number;
  armor?: number;
  magicBoost?: number;
  healthRestore?: number;
  manaRestore?: number;
  reqLevel?: number;
  reqVocation?: VocationType[];
  price: number;
  description: string;
  stackable?: boolean;
}

export interface InventoryItem {
  instanceId: string;
  defId: string;
  count: number;
  upgrades?: number;
  enchantment?: {
    id: string;
    name: string;
    bonusText: string;
    type: 'fire' | 'crit' | 'vampirism' | 'void' | 'aegis';
    color: string;
  };
}

export interface SpellDef {
  id: string;
  name: string;
  words: string;
  vocation: VocationType[];
  minLevel: number;
  minMagicLevel: number;
  manaCost: number;
  cooldownMs: number;
  range: number; // 1 = melee, >1 = ranged/aoe
  isAoe?: boolean;
  isHeal?: boolean;
  isRune?: boolean;
  basePower: number;
  element: 'physical' | 'energy' | 'fire' | 'ice' | 'earth' | 'holy' | 'healing';
  color: string;
  description: string;
}

export interface CharacterData {
  id: string;
  name: string;
  vocation: VocationType;
  promoted: boolean;
  level: number;
  experience: number;
  experienceToNext: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  capacity: number;
  gold: number;
  skills: {
    sword: number;
    swordTries: number;
    axe: number;
    axeTries: number;
    club: number;
    clubTries: number;
    distance: number;
    distanceTries: number;
    shielding: number;
    shieldingTries: number;
    magic: number;
    manaSpent: number;
  };
  equipment: Partial<Record<EquipmentSlot, InventoryItem | null>>;
  inventory: InventoryItem[];
  currentMapId: string;
  lastSavedAt: number;
  killsCount: number;
  bossKills: number;
  highestWaveCompleted: Record<string, number>;
  huntMastery?: Record<string, number>; // Map ID -> Total kills in this hunt
  masteryBonuses?: {
    bonusHp: number;
    bonusMana: number;
    bonusSkill: number;
    bonusCrit: number;
  };
  unlockedSpells: string[];
  autoHuntActive?: boolean;
  monstersSlain?: number;
  stance?: CombatStance;
  bestiaryKills?: Record<string, number>;
  runeCharges?: Record<string, number>;
  magicLevel?: number;
  magicLevelTries?: number;
  skillTries?: Record<string, number>;
  stash?: InventoryItem[];
  bounties?: DailyBounty[];
}

export interface DailyBounty {
  id: string;
  title: string;
  description: string;
  targetMonsterDefId: string;
  targetMonsterName: string;
  requiredKills: number;
  currentKills: number;
  rewardGold: number;
  rewardExp: number;
  completed: boolean;
  claimed: boolean;
}

export interface MonsterDef {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  armor: number;
  speed: number;
  exp: number;
  isBoss?: boolean;
  isRanged?: boolean;
  range?: number;
  modelType: string;
  size: number;
  color: string;
  lootTable: Array<{
    defId: string;
    chance: number; // 0.0 to 1.0
    minCount?: number;
    maxCount?: number;
  }>;
  goldMin: number;
  goldMax: number;
  spells?: Array<{
    name: string;
    chance: number;
    damage: number;
    color: string;
    isAoe?: boolean;
  }>;
}

export interface EntityState {
  id: string;
  type: 'player' | 'monster';
  name: string;
  vocation?: VocationType;
  x: number;
  y: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  rotation: number;
  hp: number;
  maxHp: number;
  mana?: number;
  maxMana?: number;
  level: number;
  isBoss?: boolean;
  modelType?: string;
  targetId?: string | null;
  isMoving?: boolean;
  isAttacking?: boolean;
  isCasting?: boolean;
  castSpellName?: string;
  castProgress?: number;
  telegraph?: {
    radius: number;
    x: number;
    z: number;
    progress: number;
  } | null;
}

export interface DropItemEntity {
  id: string;
  defId: string;
  name: string;
  count: number;
  rarity: ItemRarity;
  gold?: number;
  x: number;
  y: number;
  z: number;
  createdAt: number;
}

export interface CombatEvent {
  id: string;
  timestamp: number;
  sourceId: string;
  targetId: string;
  damage: number;
  isCrit?: boolean;
  isHeal?: boolean;
  isMana?: boolean;
  isBossHit?: boolean;
  isBlocked?: boolean;
  spellWords?: string;
  spellId?: string;
  vfxType?: 'melee_slash' | 'arrow' | 'magic_energy' | 'magic_ice' | 'magic_fire' | 'magic_holy' | 'heal_aura' | 'spell_aoe' | 'boss_smash' | 'light_spell' | 'great_light_spell' | 'spectral_dash';
  color?: string;
  x: number;
  y: number;
  z: number;
  sourceX?: number;
  sourceY?: number;
  sourceZ?: number;
}

export interface MarketListing {
  id: string;
  sellerName: string;
  item: InventoryItem;
  priceGold: number;
  createdAt: number;
}

export interface HazardField {
  id: string;
  x: number;
  y?: number;
  z: number;
  type: 'poison' | 'fire' | 'energy' | 'boss_telegraph_meteor' | 'boss_telegraph_slam' | 'boss_telegraph_deathwave';
  radius: number;
  remainingRatio: number;
  durationMs?: number;
  createdAt?: number;
  isTelegraph?: boolean;
  detonatesInMs?: number;
  spellName?: string;
}

export interface DungeonAffix {
  id: string;
  name: string;
  description: string;
  color: string;
  expBonusPct: number;
  lootBonusPct: number;
  goldBonusPct: number;
  monsterHpPct: number;
  monsterDmgPct: number;
}

export interface BreakableObject {
  id: string;
  type: 'barrel' | 'chest' | 'urn';
  x: number;
  y?: number;
  z: number;
  hp: number;
  maxHp: number;
  broken: boolean;
}

export interface DungeonFloorInfo {
  floorNumber: number;
  dungeonName: string;
  affix: DungeonAffix;
  roomsCount: number;
  bossDefeated: boolean;
  portalOpen: boolean;
  portalX?: number;
  portalZ?: number;
  seed?: number;
}

export type MapTypeCategory = 'sanctuary' | 'open_world' | 'dungeon' | 'rift' | 'world_boss';

export interface MapHuntDef {
  id: string;
  name: string;
  description: string;
  isSafeZone?: boolean;
  mapType: MapTypeCategory;
  movementMode?: 'classic_grid' | 'free_action';
  recommendedLevel: number;
  theme: 'thais_temple' | 'catacombs' | 'ruins';
  gridSize: { width: number; height: number };
  musicMood: string;
  bossMonsterId?: string;
  riftFloor?: number;
  bossMechanics?: string[];
  elementalWeakness?: string;
  specialRewards?: string[];
  monsterSpawnPool: Array<{
    monsterId: string;
    weight: number;
  }>;
  maxMonsters: number;
}

export interface OfflineReport {
  timeOfflineMs: number;
  monstersKilled: number;
  expGained: number;
  goldGained: number;
  itemsLooted: Array<{ defId: string; count: number }>;
  levelsGained: number;
  mapName: string;
}

export interface PartyMemberInfo {
  id: string;
  name: string;
  vocation: VocationType;
  level: number;
  hp: number;
  maxHp: number;
  currentMapId: string;
  floorNumber: number;
  x?: number;
  z?: number;
  rotation?: number;
  isMoving?: boolean;
  isAttacking?: boolean;
  isLeader: boolean;
  isOnline: boolean;
  lastSeen: number;
}

export type LootMode = 'shared' | 'free_for_all' | 'leader_priority';

export interface PartyState {
  code: string;
  partyCode?: string;
  leaderId: string;
  members: PartyMemberInfo[];
  sharedHuntMapId?: string;
  sharedFloorNumber?: number;
  lootMode: LootMode;
  experienceSharing: boolean;
  sharedExpBonusPercent: number;
}

// WebSocket Protocol Packets
export type ClientPacket =
  | { type: 'join'; characterName: string; vocation: VocationType }
  | { type: 'move'; x: number; z: number }
  | { type: 'move_direction'; dx: number; dz: number }
  | { type: 'move_continuous'; vx: number; vz: number; isMoving: boolean; faceX?: number; faceZ?: number }
  | { type: 'select_target'; targetId: string | null }
  | { type: 'cast_spell'; spellId: string; aimX?: number; aimZ?: number; targetId?: string | null }
  | { type: 'use_potion'; potionType: 'health' | 'mana' }
  | { type: 'set_stance'; stance: CombatStance }
  | { type: 'toggle_autohunt'; enabled: boolean }
  | { type: 'switch_map'; mapId: string; difficulty?: 'easy' | 'medium' | 'hard' }
  | { type: 'equip_item'; instanceId: string; slot: EquipmentSlot }
  | { type: 'enchant_item'; instanceId: string; enchantmentId: string }
  | { type: 'unequip_item'; slot: EquipmentSlot }
  | { type: 'drop_or_sell_item'; instanceId: string }
  | { type: 'dash' }
  | { type: 'buy_item'; itemDefId: string; count: number }
  | { type: 'stash_deposit'; instanceId: string }
  | { type: 'stash_withdraw'; instanceId: string }
  | { type: 'bounty_claim'; bountyId: string }
  | { type: 'pickup_drop'; dropId: string }
  | { type: 'claim_offline' }
  | { type: 'rest_at_shrine' }
  | { type: 'change_vocation'; vocation: VocationType }
  | { type: 'reset_character'; characterName: string; vocation: VocationType }
  | { type: 'chat'; text: string; channel?: 'say' | 'server' | 'loot' | 'party' | 'global' }
  | { type: 'descend_floor' }
  | { type: 'interact_breakable'; breakableId: string }
  | { type: 'party_join'; partyCode: string; member: PartyMemberInfo }
  | { type: 'party_leave'; partyCode: string; memberId: string }
  | { type: 'party_relay'; partyCode: string; payload: any }
  | { type: 'market_buy'; listingId: string }
  | { type: 'market_list_item'; instanceId: string; priceGold: number }
  | { type: 'market_cancel_listing'; listingId: string }
  | { type: 'dash'; dx?: number; dz?: number };

export type ServerPacket =
  | { 
      type: 'welcome'; 
      playerId: string; 
      character: CharacterData; 
      mapId: string; 
      offlineReport?: OfflineReport | null;
      floorInfo?: DungeonFloorInfo;
      partyCode?: string;
    }
  | {
      type: 'tick';
      timestamp: number;
      mapId: string;
      entities: EntityState[];
      drops: DropItemEntity[];
      combatEvents: CombatEvent[];
      waveInfo?: { currentWave: number; waveKills: number; waveTarget: number; bossAlive: boolean };
      hazards?: HazardField[];
      breakables?: BreakableObject[];
      floorInfo?: DungeonFloorInfo;
      targetId?: string | null;
    }
  | { type: 'character_sync'; character: CharacterData }
  | { type: 'level_up'; level: number; hpGain: number; manaGain: number }
  | { type: 'skill_up'; skill: SkillType; newLevel: number }
  | { type: 'chat'; sender: string; text: string; channel: 'say' | 'server' | 'loot' | 'party' | 'global'; color?: string }
  | { type: 'loot_received'; itemDefId: string; count: number; gold: number; rarity: ItemRarity }
  | { type: 'autohunt_sync'; enabled: boolean }
  | { type: 'boss_victory'; bossName: string; expGained: number; goldGained: number; itemsLooted: string[] }
  | { type: 'offline_ready'; report: OfflineReport }
  | { type: 'wave_transition'; previousWave: number; newWave: number; bossDefeatedName?: string; mapName?: string }
  | { type: 'boss_spawned'; wave: number; bossName: string }
  | { type: 'floor_descended'; floorNumber: number; affixName: string; mapName: string }
  | { type: 'party_sync'; party: PartyState }
  | { type: 'party_relay'; payload: any }
  | { type: 'market_sync'; listings: MarketListing[] }
  | { type: 'error'; message: string };
