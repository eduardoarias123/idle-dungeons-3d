import {
  BreakableObject,
  CharacterData,
  ClientPacket,
  CombatEvent,
  DropItemEntity,
  DungeonAffix,
  DungeonFloorInfo,
  EntityState,
  EquipmentSlot,
  HazardField,
  MapHuntDef,
  MarketListing,
  MonsterDef,
  ServerPacket,
  VocationType,
} from '../../types/game';
import { MAPS_DATABASE } from '../../constants/maps';
import { MONSTERS_DATABASE } from '../../constants/monsters';
import { ITEMS_DATABASE } from '../../constants/items';
import { SPELLS_DATABASE } from '../../constants/spells';
import { BESTIARY_DATABASE } from '../../constants/bestiary';
import {
  createInitialCharacter,
  getExperienceForLevel,
  getLevelFromExperience,
  VOCATIONS,
} from '../../constants/vocations';
import { HUNT_MASTERY_TIERS, calculateTotalMasteryBonuses } from '../../constants/mastery';
import { generateMapGrid, isWalkable, isPositionWalkableCircle, MapGrid } from '../../game-shared/mapLayout';
import {
  DUNGEON_AFFIXES,
  generateProceduralDungeon,
  calculatePartyDungeonSeed,
  SeededMonsterSpawn,
} from '../../game-shared/proceduralDungeon';
import { partyNetwork } from './PartyNetworkManager';
import { findPath, hasLineOfSight, findKiteStep } from '../../game-shared/pathfinding';
import { calculateMonsterAttack, calculatePlayerAttack, calculateSpellCast } from '../../game-shared/combat';
import { calculateOfflineProgress } from '../../game-shared/offline';
import { ensureCharacterBounties } from '../../game-shared/bounties';
import { logger } from '../../utils/logger';
import {
  getSqmDistance,
  getManhattanDistance,
  isAdjacentSqm,
  getVocationAttackRange,
  getMonsterAttackRange,
  getSpellRange,
  snapToSqm,
  snapPointToSqm,
  getStepDurationMs,
  getMonsterStepDurationMs,
} from '../../game-shared/distance';

interface ActiveMonster {
  id: string;
  defId: string;
  def: MonsterDef;
  mapId: string;
  x: number;
  y: number;
  z: number;
  spawnX: number;
  spawnZ: number;
  currentPath: Array<{ x: number; z: number }>;
  hp: number;
  maxHp: number;
  targetPlayerId: string | null;
  attackCooldownUntil: number;
  spellCooldownUntil: number;
  telegraph: { radius: number; x: number; z: number; progress: number } | null;
  telegraphTimer: number;
  nextPatrolTime?: number;
  rotation?: number;
}

interface HazardFieldInternal {
  id: string;
  x: number;
  y?: number;
  z: number;
  type: 'poison' | 'fire' | 'energy' | 'boss_telegraph_meteor' | 'boss_telegraph_slam' | 'boss_telegraph_deathwave';
  radius: number;
  durationMs: number;
  createdAt: number;
  damagePerTick: number;
  lastTickAt: number;
  isTelegraph?: boolean;
  detonatesInMs?: number;
  spellName?: string;
}

interface MapRoomState {
  def: MapHuntDef;
  grid: MapGrid;
  monsters: Map<string, ActiveMonster>;
  drops: Map<string, DropItemEntity>;
  hazards: Map<string, HazardFieldInternal>;
  breakables: Map<string, BreakableObject>;
  wave: number;
  floorNumber: number;
  seed: number;
  affix: DungeonAffix;
  killsInWave: number;
  targetKillsForBoss: number;
  bossAlive: boolean;
  portalOpen: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const LOCAL_STORAGE_KEY = 'tibia3d_character_data';

export class LocalGameEngine {
  private character: CharacterData | null = null;
  // Contador para evitar spam de log: o tick roda a cada 25ms
  private tickErrorCount = 0;
  private playerPos = { x: 16, y: 0, z: 16 };
  private playerRotation = 0;
  private currentPath: Array<{ x: number; z: number }> = [];
  private continuousVelocity = { vx: 0, vz: 0, active: false };
  private clickMoveTarget: { x: number; z: number } | null = null;
  private targetId: string | null = null;
  private isAutoHunting = false;
  private patrolWaypointIndex = 0;
  private attackCooldownUntil = 0;
  private lastDashTime = 0;
  private dashMomentumUntil = 0;
  private spellCooldowns: Record<string, number> = {};
  private lastRegenTick = Date.now();
  private lastAutoSaveTime = Date.now();
  private lastTickTime = Date.now();

  private currentMapId = 'HUB_THAIS';
  private rooms = new Map<string, MapRoomState>();
  private pendingCombatEvents: CombatEvent[] = [];
  private tickInterval: number | null = null;
  private remotePlayers = new Map<string, EntityState>();
  private lastPartyBroadcastTime = 0;

  private marketListings: MarketListing[] = [
    {
      id: 'mkt_1',
      sellerName: 'Mercador Harlan',
      item: {
        instanceId: 'item_mkt_1',
        defId: 'dragon_slayer',
        count: 1,
        enchantment: {
          id: 'fire',
          name: 'Runa do Fogo Ancestral',
          bonusText: '+15% Dano de Fogo',
          type: 'fire',
          color: '#f97316',
        },
      },
      priceGold: 2500,
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'mkt_2',
      sellerName: 'Vendedor Eric',
      item: {
        instanceId: 'item_mkt_2',
        defId: 'demon_shield',
        count: 1,
        enchantment: {
          id: 'aegis',
          name: 'Runa Protetora de Aegis',
          bonusText: '+12 Defesa & Shielding',
          type: 'aegis',
          color: '#38bdf8',
        },
      },
      priceGold: 3200,
      createdAt: Date.now() - 1800000,
    },
    {
      id: 'mkt_3',
      sellerName: 'Mago Elrond',
      item: {
        instanceId: 'item_mkt_3',
        defId: 'potion_health',
        count: 20,
      },
      priceGold: 800,
      createdAt: Date.now() - 900000,
    },
    {
      id: 'mkt_4',
      sellerName: 'Caçador Boromir',
      item: {
        instanceId: 'item_mkt_4',
        defId: 'boots_of_haste',
        count: 1,
      },
      priceGold: 1800,
      createdAt: Date.now() - 400000,
    },
  ];

  // Packet emission callbacks matching GameSocket
  public onPacket: (packet: ServerPacket) => void = () => {};
  public onConnectionChange: (connected: boolean) => void = () => {};

  public syncMarket() {
    this.onPacket({
      type: 'market_sync',
      listings: this.marketListings,
    });
  }

  constructor() {
    this.initRooms();
  }

  private initTrainingDummies(room: MapRoomState) {
    const dummyDef = MONSTERS_DATABASE['training_dummy'];
    if (!dummyDef) return;

    // Place 2 training dummies on the right training wing of Thais temple
    const dummy1: ActiveMonster = {
      id: 'dummy_1',
      defId: 'training_dummy',
      def: dummyDef,
      mapId: 'HUB_THAIS',
      x: 18.5,
      y: 0,
      z: 7.5,
      spawnX: 18.5,
      spawnZ: 7.5,
      currentPath: [],
      hp: dummyDef.maxHp,
      maxHp: dummyDef.maxHp,
      targetPlayerId: null,
      attackCooldownUntil: 0,
      spellCooldownUntil: 0,
      telegraph: null,
      telegraphTimer: 0,
    };

    const dummy2: ActiveMonster = {
      id: 'dummy_2',
      defId: 'training_dummy',
      def: dummyDef,
      mapId: 'HUB_THAIS',
      x: 18.5,
      y: 0,
      z: 15.5,
      spawnX: 18.5,
      spawnZ: 15.5,
      currentPath: [],
      hp: dummyDef.maxHp,
      maxHp: dummyDef.maxHp,
      targetPlayerId: null,
      attackCooldownUntil: 0,
      spellCooldownUntil: 0,
      telegraph: null,
      telegraphTimer: 0,
    };

    room.monsters.set(dummy1.id, dummy1);
    room.monsters.set(dummy2.id, dummy2);
  }

  private createHubRoom(): MapRoomState {
    const def = MAPS_DATABASE['HUB_THAIS'];
    const grid = generateMapGrid('HUB_THAIS');
    const room: MapRoomState = {
      def,
      grid,
      monsters: new Map(),
      drops: new Map(),
      hazards: new Map(),
      breakables: new Map(),
      wave: 1,
      floorNumber: 1,
      seed: 1,
      affix: DUNGEON_AFFIXES[0],
      killsInWave: 0,
      targetKillsForBoss: 0,
      bossAlive: false,
      portalOpen: false,
    };
    this.initTrainingDummies(room);
    this.rooms.set('HUB_THAIS', room);
    return room;
  }

  private initRooms() {
    this.createHubRoom();
  }

  public start(characterName: string, vocation: string) {
    logger.event('LocalGameEngine.start', `Iniciando motor local para "${characterName}" (${vocation}).`);
    // Load or create character locally from localStorage
    let char = this.loadSavedCharacter(characterName);
    let offlineReport = null;

      if (!char) {
        logger.event('LocalGameEngine.start', `Nenhum save encontrado para "${characterName}"; criando personagem novo.`);
        char = createInitialCharacter(characterName, vocation as VocationType);
        this.saveCharacterLocally(char);
      } else {
        logger.info('LocalGameEngine.start', `Save carregado do localStorage para "${char.name}".`, {
          level: char.level,
          currentMapId: char.currentMapId,
          hp: char.hp,
          inventoryLength: char.inventory?.length,
        });
        offlineReport = calculateOfflineProgress(char);
        if (offlineReport && (offlineReport.monstersKilled > 0 || offlineReport.expGained > 0)) {
          this.saveCharacterLocally(char);
        }
      }

      if (!char.huntMastery) {
        char.huntMastery = {};
      }
      if (!char.bestiaryKills) {
        char.bestiaryKills = {};
      }
      if (!char.unlockedSpells || !Array.isArray(char.unlockedSpells)) {
        char.unlockedSpells = [...(VOCATIONS[char.vocation]?.startingSpells || ['exura'])];
      }
      if (!char.inventory || !Array.isArray(char.inventory)) {
        char.inventory = [];
      }
      if (!char.equipment) {
        char.equipment = {
          weapon: null,
          shield: null,
          armor: null,
          legs: null,
          boots: null,
          helmet: null,
          amulet: null,
          ring: null,
          backpack: null,
        };
      }
      if (!char.skills) {
        char.skills = {
          sword: 10,
          swordTries: 0,
          axe: 10,
          axeTries: 0,
          club: 10,
          clubTries: 0,
          distance: 10,
          distanceTries: 0,
          shielding: 10,
          shieldingTries: 0,
          magic: 0,
          manaSpent: 0,
        };
      }
      if (!char.runeCharges) {
        char.runeCharges = {
          rune_sd: 8,
          rune_gfb: 15,
          rune_hmm: 25,
          rune_uh: 12,
        };
      }
      char.stash = char.stash || [];
      char.bounties = ensureCharacterBounties(char.bounties);
      this.recalculateMasteryBonuses(char, false);

      this.character = char;
      this.currentMapId = char.currentMapId || 'HUB_THAIS';

      const room = this.rooms.get(this.currentMapId) || this.rooms.get('HUB_THAIS')!;
      this.playerPos = { x: room.grid.spawnPoint.x, y: 0, z: room.grid.spawnPoint.z };
      this.currentPath = [];
      this.targetId = null;
      this.isAutoHunting = Boolean(char.autoHuntActive);
      this.character.autoHuntActive = this.isAutoHunting;
      this.patrolWaypointIndex = 0;
      this.attackCooldownUntil = 0;
      this.spellCooldowns = {};
      this.lastRegenTick = Date.now();

      // Notify connected
      this.onConnectionChange(true);

      // Send Welcome packet
      this.onPacket({
        type: 'welcome',
        playerId: this.character.id,
        character: this.character,
        mapId: this.currentMapId,
        offlineReport,
      });

      // Send autohunt sync to ensure client UI is in 100% lockstep
      this.onPacket({
        type: 'autohunt_sync',
        enabled: this.isAutoHunting,
      });

      // Initialize multiplayer party network
      partyNetwork.init({
        id: this.character.id,
        name: this.character.name,
        vocation: this.character.vocation,
        level: this.character.level,
      });

      partyNetwork.onRemotePlayerUpdate = (player) => {
        if (!this.character) return;
        const currentRoom = this.rooms.get(this.currentMapId);
        const myFloor = currentRoom?.floorNumber || 1;

        if (player.currentMapId === this.currentMapId && player.floorNumber === myFloor) {
          this.remotePlayers.set(player.id, {
            id: player.id,
            name: player.name,
            type: 'player',
            vocation: player.vocation,
            level: player.level,
            hp: player.hp,
            maxHp: player.maxHp,
            x: player.x ?? this.playerPos.x,
            y: 0,
            z: player.z ?? this.playerPos.z,
            targetX: player.x,
            targetZ: player.z,
            rotation: player.rotation,
            isMoving: Boolean(player.isMoving),
            isAttacking: Boolean(player.isAttacking),
          });
        } else {
          this.remotePlayers.delete(player.id);
        }
      };

      partyNetwork.onPartyCombatEvent = (evt, monsterId, damage) => {
        const room = this.rooms.get(this.currentMapId);
        if (!room) return;
        if (monsterId && damage && room.monsters.has(monsterId)) {
          const m = room.monsters.get(monsterId)!;
          m.hp = Math.max(0, m.hp - damage);
          if (m.hp <= 0) {
            this.handleMonsterDeath(room, m);
          }
        }
        this.pendingCombatEvents.push(evt);
      };

      partyNetwork.onPartyMonsterDefeat = (monsterId, exp, gold, killerName) => {
        const room = this.rooms.get(this.currentMapId);
      if (!room) return;
      if (room.monsters.has(monsterId)) {
        const m = room.monsters.get(monsterId)!;
        this.handleMonsterDeath(room, m);
      }
      if (this.character) {
        const partyState = partyNetwork.getPartyState();
        const bonusPercent = partyState.sharedExpBonusPercent || 20;
        const partyExpBonus = Math.max(1, Math.round(exp * (partyState.experienceSharing ? bonusPercent / 100 : 0.05)));
        this.character.experience += partyExpBonus;

        // Apply Gold according to lootMode
        let goldAwarded = 0;
        if (partyState.lootMode === 'shared') {
          goldAwarded = Math.max(1, Math.round(gold / Math.max(1, partyNetwork.members.size)));
        } else if (partyState.lootMode === 'leader_priority') {
          goldAwarded = partyNetwork.isLeader ? gold : Math.max(1, Math.round(gold * 0.3));
        } else {
          // free_for_all: small assistant share if not the killer
          goldAwarded = killerName === this.character.name ? gold : 0;
        }

        if (goldAwarded > 0) {
          this.character.gold += goldAwarded;
        }

        const newLevel = getLevelFromExperience(this.character.experience);
        if (newLevel > this.character.level) {
          const voc = VOCATIONS[this.character.vocation];
          const diff = newLevel - this.character.level;
          this.character.level = newLevel;
          this.character.maxHp += voc.hpPerLevel * diff;
          this.character.maxMana += voc.manaPerLevel * diff;
          this.character.capacity += voc.capPerLevel * diff;
          this.character.hp = this.character.maxHp;
          this.character.mana = this.character.maxMana;
          this.character.experienceToNext = getExperienceForLevel(this.character.level + 1);

          this.onPacket({
            type: 'level_up',
            level: newLevel,
            hpGain: voc.hpPerLevel * diff,
            manaGain: voc.manaPerLevel * diff,
          });

          this.sendChatMessage('Server', `🎉 Parabéns! Você avançou para o Level ${newLevel}!`, 'server', '#fbbf24');
        }

        const goldText = goldAwarded > 0 ? ` +${goldAwarded} GP [${partyState.lootMode.toUpperCase()}]` : '';
        this.sendChatMessage(
          'Party',
          `👥 Bônus de Grupo (+${bonusPercent}% EXP${goldText}): +${partyExpBonus} EXP de monstro abatido por ${killerName}!`,
          'party',
          '#4ade80'
        );
      }
    };

    partyNetwork.onPartyBreakableHit = (breakableId) => {
      this.breakObject(breakableId, false);
    };

    partyNetwork.onPartyPortalTrigger = (floorNumber, leaderName, seed) => {
      const room = this.rooms.get(this.currentMapId);
      if (room) {
        room.portalOpen = true;
        if (seed !== undefined) {
          room.seed = seed;
        }
      }
      this.sendChatMessage(
        'Party',
        `🌀 ${leaderName} ativou o Portal para o Andar B${floorNumber}! Semente de masmorra sincronizada.`,
        'party',
        '#38bdf8'
      );
    };

    partyNetwork.onPartyChatMessage = (sender, text) => {
      this.sendChatMessage(sender, text, 'party', '#4ade80');
    };

    this.sendChatMessage(
      'Server',
      `⚡ [Modo Local Ativo] Rodando 100% offline com latência zero (0ms)!`,
      'server',
      '#10b981'
    );

    // Start 20Hz local simulation tick (50ms interval) for ultra-fluid physics
    this.startLoop();
    logger.event('LocalGameEngine.start', `Motor local iniciado com sucesso para "${char.name}" no mapa ${this.currentMapId}.`, {
      isAutoHunting: this.isAutoHunting,
      playerPos: this.playerPos,
    });
  }

  public stop() {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.character) {
      this.saveCharacterLocally(this.character);
    }
    this.onConnectionChange(false);
  }

  private lastCloudSyncTime = 0;

  private loadSavedCharacter(characterName: string): CharacterData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed: CharacterData = JSON.parse(raw);
      if (parsed && parsed.name.toLowerCase() === characterName.toLowerCase()) {
        if (!parsed.huntMastery) parsed.huntMastery = {};
        if (parsed.killsCount === undefined) parsed.killsCount = 0;
        if (parsed.bossKills === undefined) parsed.bossKills = 0;
        if (!parsed.skills) {
          parsed.skills = {
            sword: 10,
            swordTries: 0,
            axe: 10,
            axeTries: 0,
            club: 10,
            clubTries: 0,
            distance: 10,
            distanceTries: 0,
            shielding: 10,
            shieldingTries: 0,
            magic: 0,
            manaSpent: 0,
          };
        }
        return parsed;
      }
    } catch (e) {
      console.warn('[LocalGameEngine] Failed to load character:', e);
    }
    return null;
  }

  public saveCharacterLocally(char: CharacterData) {
    try {
      char.lastSavedAt = Date.now();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(char));

      // Periodic cloud backup to server every 8s
      const now = Date.now();
      if (now - this.lastCloudSyncTime >= 8000) {
        this.lastCloudSyncTime = now;
        this.syncCharacterToServer(char);
      }
    } catch (e) {
      console.warn('[LocalGameEngine] Failed to save character:', e);
    }
  }

  public async syncCharacterToServer(char?: CharacterData): Promise<boolean> {
    const target = char || this.character;
    if (!target) return false;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  public importSaveData(importedData: CharacterData): boolean {
    try {
      if (!importedData || !importedData.name || !importedData.vocation) {
        return false;
      }
      importedData.lastSavedAt = Date.now();
      this.character = importedData;
      this.saveCharacterLocally(importedData);
      this.syncCharacterToServer(importedData);
      this.syncCharacter();
      return true;
    } catch (err) {
      console.error('Failed to import save:', err);
      return false;
    }
  }

  private getPlayerAttackRange(): number {
    if (!this.character) return 1;
    return getVocationAttackRange(this.character.vocation);
  }

  private recalculateMasteryBonuses(char: CharacterData, notify = true) {
    const bonuses = calculateTotalMasteryBonuses(char.huntMastery || {});
    char.masteryBonuses = {
      bonusHp: bonuses.totalHp,
      bonusMana: bonuses.totalMana,
      bonusSkill: bonuses.totalSkill,
      bonusCrit: bonuses.totalCrit,
    };
  }

  private startLoop() {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
    }
    logger.info('LocalGameEngine.startLoop', 'Loop de simulação (25ms) iniciado.');
    this.tickInterval = window.setInterval(() => {
      // try/catch: um erro no tick NÃO pode derrubar o loop nem a página
      try {
        this.tick();
      } catch (e) {
        this.tickErrorCount += 1;
        if (this.tickErrorCount <= 5 || this.tickErrorCount % 200 === 0) {
          logger.exception(
            'LocalGameEngine.tick',
            `Exceção não tratada no tick do motor local (ocorrência #${this.tickErrorCount})`,
            e,
            {
              mapId: this.currentMapId,
              hasCharacter: Boolean(this.character),
              characterName: this.character?.name,
              targetId: this.targetId,
              isAutoHunting: this.isAutoHunting,
              playersRemote: this.remotePlayers?.size,
            }
          );
        }
      }
    }, 25);
  }

  public isFreeActionMode(room?: MapRoomState): boolean {
    return true; // Universal Diablo 3 ARPG 360° Fluid Movement across all maps
  }

  private tick() {
    if (!this.character) return;
    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;
    const room = this.rooms.get(this.currentMapId) || this.rooms.get('HUB_THAIS')!;

    // 1. Natural Regeneration
    if (now - this.lastRegenTick >= 2000) {
      const voc = VOCATIONS[this.character.vocation];
      if (this.character.hp < this.character.maxHp) {
        this.character.hp = Math.min(this.character.maxHp, this.character.hp + (voc.hpRegenPerTick || 3));
      }
      if (this.character.mana < this.character.maxMana) {
        this.character.mana = Math.min(this.character.maxMana, this.character.mana + (voc.manaRegenPerTick || 2));
      }
      this.lastRegenTick = now;
      this.syncCharacter();
    }

    // 2. Auto-save every 4 seconds
    if (now - this.lastAutoSaveTime >= 4000) {
      this.saveCharacterLocally(this.character);
      this.lastAutoSaveTime = now;
    }

    // 2.5 Process Environmental Hazards (Fire, Poison, Energy pools on ground)
    if (room.hazards && room.hazards.size > 0) {
      for (const [hId, hazard] of room.hazards.entries()) {
        if (now - hazard.createdAt >= hazard.durationMs) {
          room.hazards.delete(hId);
          continue;
        }

        // Damage Player standing in hazard
        const distToPlayer = Math.hypot(this.playerPos.x - hazard.x, this.playerPos.z - hazard.z);
        if (distToPlayer <= hazard.radius && now - hazard.lastTickAt >= 1000) {
          hazard.lastTickAt = now;
          const dmg = hazard.damagePerTick;
          this.character.hp = Math.max(0, this.character.hp - dmg);
          const color = hazard.type === 'poison' ? '#22c55e' : hazard.type === 'fire' ? '#f97316' : '#38bdf8';
          const label = hazard.type === 'poison' ? 'Poison' : hazard.type === 'fire' ? 'Burn' : 'Shock';

          this.pendingCombatEvents.push({
            id: 'haz_dmg_' + Math.random().toString(36).substring(2, 9),
            timestamp: now,
            sourceId: hId,
            targetId: this.character.id,
            x: this.playerPos.x,
            y: this.playerPos.y,
            z: this.playerPos.z,
            damage: dmg,
            isCrit: false,
            isHeal: false,
            spellWords: label,
            color,
          });

          if (this.character.hp <= 0) {
            this.handlePlayerDeath(room);
          }
        }
      }
    }

    // 3. Proximity Auto-Targeting & Auto-Engage
    if (!room.def.isSafeZone) {
      if (!this.targetId || !room.monsters.has(this.targetId)) {
        if (this.isAutoHunting) {
          let nearestDist = Math.max(5, this.getPlayerAttackRange() + 1);
          let nearestMonsterId: string | null = null;
          let nearestHasLoS = false;
          for (const [mId, m] of room.monsters.entries()) {
            const dist = getSqmDistance(m.x, m.z, this.playerPos.x, this.playerPos.z);
            const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z);
            if (dist <= nearestDist) {
              if (hasLoS || !nearestHasLoS) {
                nearestDist = dist;
                nearestMonsterId = mId;
                nearestHasLoS = hasLoS;
              }
            }
          }
          if (nearestMonsterId) {
            this.targetId = nearestMonsterId;
          }
        } else {
          // In manual control, only auto-retaliate if a monster is already in immediate melee range attacking player
          let meleeAttackerId: string | null = null;
          for (const [mId, m] of room.monsters.entries()) {
            if (m.targetPlayerId === this.character.id) {
              const dist = getSqmDistance(m.x, m.z, this.playerPos.x, this.playerPos.z);
              if (dist <= 1.2) {
                meleeAttackerId = mId;
                break;
              }
            }
          }
          if (meleeAttackerId) {
            this.targetId = meleeAttackerId;
          }
        }
      }
    }

    // 4. Auto-Hunt Cavebot
    if (this.isAutoHunting && !room.def.isSafeZone) {
      this.processAutoHunt(room, now);
    }

    // 5. Universal Diablo 3 ARPG 360° Free Action Movement Engine
    const stepDurationMs = getStepDurationMs(
      this.character.level,
      Boolean(this.character.equipment?.boots?.defId === 'boots_haste')
    );
    const baseTilesPerSec = (1000 / stepDurationMs) * 1.25;
    const isDashMomentum = now < this.dashMomentumUntil;
    const tilesPerSec = isDashMomentum ? baseTilesPerSec * 1.35 : baseTilesPerSec;

    let moveVx = 0;
    let moveVz = 0;

    if (this.continuousVelocity.active && Math.hypot(this.continuousVelocity.vx, this.continuousVelocity.vz) > 0.05) {
      const len = Math.hypot(this.continuousVelocity.vx, this.continuousVelocity.vz);
      moveVx = this.continuousVelocity.vx / len;
      moveVz = this.continuousVelocity.vz / len;
      this.playerRotation = Math.atan2(moveVx, moveVz);
    } else if (this.clickMoveTarget) {
      const cdx = this.clickMoveTarget.x - this.playerPos.x;
      const cdz = this.clickMoveTarget.z - this.playerPos.z;
      const cDist = Math.hypot(cdx, cdz);
      if (cDist <= 0.15) {
        this.clickMoveTarget = null;
      } else {
        moveVx = cdx / cDist;
        moveVz = cdz / cDist;
        this.playerRotation = Math.atan2(moveVx, moveVz);
      }
    } else if (this.currentPath.length > 0) {
      const next = this.currentPath[0];
      const pdx = next.x - this.playerPos.x;
      const pdz = next.z - this.playerPos.z;
      const pDist = Math.hypot(pdx, pdz);
      if (pDist <= 0.25) {
        this.currentPath.shift();
      } else {
        moveVx = pdx / pDist;
        moveVz = pdz / pDist;
        this.playerRotation = Math.atan2(moveVx, moveVz);
      }
    }

    if (moveVx !== 0 || moveVz !== 0) {
      const deltaDist = tilesPerSec * dt;
      const propDx = moveVx * deltaDist;
      const propDz = moveVz * deltaDist;
      const pRadius = 0.30;

      // Smooth Sliding Wall Collision on X and Z (classic Diablo 3 ARPG feel)
      const targetX = this.playerPos.x + propDx;
      if (isPositionWalkableCircle(room.grid, targetX, this.playerPos.z, pRadius)) {
        this.playerPos.x = targetX;
      }

      const targetZ = this.playerPos.z + propDz;
      if (isPositionWalkableCircle(room.grid, this.playerPos.x, targetZ, pRadius)) {
        this.playerPos.z = targetZ;
      }
    }

    // Smooth target tracking rotation when attacking in place
    if (this.targetId && room.monsters.has(this.targetId) && moveVx === 0 && moveVz === 0) {
      const targetM = room.monsters.get(this.targetId)!;
      const mdx = targetM.x - this.playerPos.x;
      const mdz = targetM.z - this.playerPos.z;
      if (Math.hypot(mdx, mdz) > 0.05) {
        this.playerRotation = Math.atan2(mdx, mdz);
      }
    }

    // Stop walking once inside attack range and line of sight if chasing a monster
    if (this.targetId && room.monsters.has(this.targetId)) {
      const monster = room.monsters.get(this.targetId)!;
      const distToMonster = getSqmDistance(this.playerPos.x, this.playerPos.z, monster.x, monster.z);
      const attackRange = this.getPlayerAttackRange();
      const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);
      const isRanged = attackRange > 1;
      const isTooClose = isRanged && distToMonster <= 2;

      if (distToMonster <= attackRange && hasLoS && !isTooClose) {
        this.currentPath = [];
        this.clickMoveTarget = null;
      }
    }

    // 6. Player Auto-Attack, Positioning & Tactical Kiting
    let isPlayerInRangeAndAttacking = false;
    if (this.targetId && room.monsters.has(this.targetId)) {
      const monster = room.monsters.get(this.targetId)!;
      const dist = getSqmDistance(this.playerPos.x, this.playerPos.z, monster.x, monster.z);
      const attackRange = this.getPlayerAttackRange();
      const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);
      const isRanged = attackRange > 1;

      if (dist <= attackRange && hasLoS) {
        // Target is within attack range and has direct line of sight: execute attack sequence
        isPlayerInRangeAndAttacking = true;
        this.processPlayerAttack(room, now);

        // If ranged vocation (Paladin/Sorcerer/Druid) and enemy gets into melee danger (dist <= 2), kite away!
        if (isRanged && dist <= 2 && this.currentPath.length === 0) {
          const obstacles = Array.from(room.monsters.values()).map((m) => ({ x: m.x, z: m.z }));
          const kiteStep = findKiteStep(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z, {
            dangerDistance: 2,
            desiredDistance: 3,
            maxDistance: attackRange,
            otherObstacles: obstacles,
          });
          if (kiteStep) {
            this.currentPath = [kiteStep];
          }
        }
      } else {
        // Target is out of range OR obstructed by walls: actively navigate into range and LoS before attacking
        isPlayerInRangeAndAttacking = false;
        if (this.currentPath.length === 0) {
          const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);
          if (path.length > 0) {
            this.currentPath = path;
          }
        }
      }
    }

    // 7. Monster AI & Spawns
    this.processMonsters(room, now);

    // 8. Auto-pickup loot within 1.8 tiles
    this.processDrops(room);

    // 9. Environmental Hazards & Boss Telegraphs
    this.processHazards(room, now);

    // 9. Dispatch World Tick Packet
    if (this.currentPath.length > 0) {
      const nextNode = this.currentPath[0];
      const dx = nextNode.x - this.playerPos.x;
      const dz = nextNode.z - this.playerPos.z;
      if (Math.hypot(dx, dz) > 0.005) {
        this.playerRotation = Math.atan2(dx, dz);
      }
    } else if (this.targetId && room.monsters.has(this.targetId)) {
      const targetMonster = room.monsters.get(this.targetId)!;
      const dx = targetMonster.x - this.playerPos.x;
      const dz = targetMonster.z - this.playerPos.z;
      if (Math.hypot(dx, dz) > 0.005) {
        this.playerRotation = Math.atan2(dx, dz);
      }
    }

    const isPlayerMoving = Boolean(
      (this.continuousVelocity.active && (this.continuousVelocity.vx !== 0 || this.continuousVelocity.vz !== 0)) ||
      this.clickMoveTarget ||
      this.currentPath.length > 0
    );

    const playerRot = this.playerRotation;

    const entities: EntityState[] = [
      {
        id: this.character.id,
        name: this.character.name,
        type: 'player',
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
        targetX: this.playerPos.x,
        targetZ: this.playerPos.z,
        rotation: playerRot,
        hp: this.character.hp,
        maxHp: this.character.maxHp,
        mana: this.character.mana,
        maxMana: this.character.maxMana,
        level: this.character.level,
        vocation: this.character.vocation,
        isMoving: isPlayerMoving,
        isAttacking: isPlayerInRangeAndAttacking,
        targetId: this.targetId || undefined,
      },
    ];

    // Include synchronized party members in the same dungeon instance
    for (const remotePlayer of this.remotePlayers.values()) {
      entities.push(remotePlayer);
    }

    // Periodically broadcast local player status to party members (10Hz)
    if (partyNetwork.partyCode && this.character && now - this.lastPartyBroadcastTime >= 100) {
      this.lastPartyBroadcastTime = now;
      partyNetwork.broadcastPlayerState({
        hp: this.character.hp,
        maxHp: this.character.maxHp,
        currentMapId: this.currentMapId,
        floorNumber: room.floorNumber || 1,
        x: this.playerPos.x,
        z: this.playerPos.z,
        rotation: playerRot,
        isMoving: this.currentPath.length > 0,
        isAttacking: isPlayerInRangeAndAttacking,
      });
    }

    for (const monster of room.monsters.values()) {
      if (monster.currentPath.length > 0) {
        const nextM = monster.currentPath[0];
        const dx = nextM.x - monster.x;
        const dz = nextM.z - monster.z;
        if (Math.hypot(dx, dz) > 0.005) {
          monster.rotation = Math.atan2(dx, dz);
        }
      } else if (monster.targetPlayerId) {
        const dx = this.playerPos.x - monster.x;
        const dz = this.playerPos.z - monster.z;
        if (Math.hypot(dx, dz) > 0.005) {
          monster.rotation = Math.atan2(dx, dz);
        }
      }

      entities.push({
        id: monster.id,
        name: monster.def.name,
        type: 'monster',
        x: monster.x,
        y: monster.y,
        z: monster.z,
        targetX: monster.x,
        targetZ: monster.z,
        rotation: monster.rotation ?? 0,
        hp: monster.hp,
        maxHp: monster.maxHp,
        level: monster.def.isBoss ? 15 : 5,
        modelType: monster.def.modelType,
        isMoving: monster.currentPath.length > 0,
        isBoss: monster.def.isBoss,
        telegraph: monster.telegraph || undefined,
      });
    }

    const dropsList = Array.from(room.drops.values());
    const combatEvents = [...this.pendingCombatEvents];
    this.pendingCombatEvents = [];
    const hazardsList: HazardField[] = Array.from(room.hazards?.values() || []).map((h) => ({
      id: h.id,
      type: h.type,
      x: h.x,
      y: h.y || 0.04,
      z: h.z,
      radius: h.radius,
      remainingRatio: Math.max(0, 1 - (now - h.createdAt) / h.durationMs),
      durationMs: h.durationMs,
      createdAt: h.createdAt,
    }));

    const breakablesList = Array.from(room.breakables?.values() || []);

    const floorInfo: DungeonFloorInfo | undefined = room.def.mapType === 'dungeon'
      ? {
          floorNumber: room.floorNumber || 1,
          dungeonName: `${room.def.name} - B${room.floorNumber || 1}`,
          affix: room.affix || DUNGEON_AFFIXES[0],
          roomsCount: room.grid.rooms.length,
          bossDefeated: !room.bossAlive && room.killsInWave >= room.targetKillsForBoss,
          portalOpen: Boolean(room.portalOpen),
          portalX: room.grid.bossArenaCenter?.x,
          portalZ: room.grid.bossArenaCenter?.z,
          seed: room.seed,
        }
      : undefined;

    this.onPacket({
      type: 'tick',
      timestamp: now,
      mapId: this.currentMapId,
      entities,
      drops: dropsList,
      combatEvents,
      hazards: hazardsList,
      breakables: breakablesList,
      floorInfo,
      targetId: this.targetId,
      waveInfo: room.def.mapType === 'dungeon'
        ? {
            currentWave: room.wave,
            waveKills: room.killsInWave,
            waveTarget: room.targetKillsForBoss,
            bossAlive: room.bossAlive,
          }
        : undefined,
    });
  }

  private processAutoHunt(room: MapRoomState, now: number) {
    if (!this.character) return;

    // A. Auto-cast healing spell or potion if HP < 60%
    const hpPct = (this.character.hp / this.character.maxHp) * 100;
    if (hpPct < 60) {
      const healSpell = this.character.unlockedSpells.find((sid) => SPELLS_DATABASE[sid]?.isHeal);
      if (healSpell && this.character.mana >= (SPELLS_DATABASE[healSpell]?.manaCost || 20)) {
        this.castSpell(healSpell);
      } else {
        const hpPot = this.character.inventory.find((i) => i.defId === 'potion_health' || i.defId === 'potion_strong_health');
        if (hpPot) {
          this.usePotion('health');
        }
      }
    }

    // B. Target Selection: Prioritize Boss if alive, otherwise nearest monster within 14 blocks
    let bossMonster: ActiveMonster | undefined;
    for (const m of room.monsters.values()) {
      if (m.def.isBoss) {
        bossMonster = m;
        break;
      }
    }

    if (bossMonster) {
      if (this.targetId !== bossMonster.id) {
        this.targetId = bossMonster.id;
        this.currentPath = [];
      }
    } else if (!this.targetId || !room.monsters.has(this.targetId)) {
      let nearestDist = 14;
      let nearestId: string | null = null;
      let nearestHasLoS = false;
      for (const [mId, m] of room.monsters.entries()) {
        const dist = getSqmDistance(m.x, m.z, this.playerPos.x, this.playerPos.z);
        const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z);
        if (dist < nearestDist) {
          if (hasLoS || !nearestHasLoS) {
            nearestDist = dist;
            nearestId = mId;
            nearestHasLoS = hasLoS;
          }
        }
      }
      this.targetId = nearestId;
    }

    // C. Approach target or Patrol
    if (this.targetId && room.monsters.has(this.targetId)) {
      const target = room.monsters.get(this.targetId)!;
      const dist = getSqmDistance(target.x, target.z, this.playerPos.x, this.playerPos.z);
      const attackRange = this.getPlayerAttackRange();
      const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, target.x, target.z);
      const isRanged = attackRange > 1;

      if (dist > attackRange || !hasLoS) {
        // Actively move towards the selected monster until entering attack range with clear LoS
        if (this.currentPath.length === 0) {
          const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, target.x, target.z);
          if (path.length > 0) {
            this.currentPath = path;
          }
        }
      } else if (isRanged && dist <= 2) {
        // Ranged kiting during auto-hunt: step back to ideal range (3 SQMs) away from approaching melee monster
        if (this.currentPath.length === 0) {
          const obstacles = Array.from(room.monsters.values()).map((m) => ({ x: m.x, z: m.z }));
          const kiteStep = findKiteStep(room.grid, this.playerPos.x, this.playerPos.z, target.x, target.z, {
            dangerDistance: 2,
            desiredDistance: 3,
            maxDistance: attackRange,
            otherObstacles: obstacles,
          });
          if (kiteStep) {
            this.currentPath = [kiteStep];
          }
        }
      } else {
        // Inside attack range and clear line of sight: stop walking and focus on attacking
        this.currentPath = [];
      }

      // Offensive spell casting during auto-hunt
      if (dist <= attackRange + 1 && hasLoS && this.character.mana >= 30) {
        const offensiveSpell = this.character.unlockedSpells.find((sid) => {
          const sp = SPELLS_DATABASE[sid];
          return sp && !sp.isHeal && (this.spellCooldowns[sid] || 0) <= now;
        });
        if (offensiveSpell) {
          this.castSpell(offensiveSpell);
        }
      }
    } else {
      // Patrol waypoints
      const waypoints = room.grid.rooms.map((r) => ({
        x: r.x + Math.floor(r.w / 2) + 0.5,
        z: r.z + Math.floor(r.h / 2) + 0.5,
      }));

      if (waypoints && waypoints.length > 0) {
        const wp = waypoints[this.patrolWaypointIndex % waypoints.length];
        const dist = getSqmDistance(wp.x, wp.z, this.playerPos.x, this.playerPos.z);
        if (dist <= 1) {
          this.patrolWaypointIndex = (this.patrolWaypointIndex + 1) % waypoints.length;
        } else if (this.currentPath.length === 0) {
          const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, wp.x, wp.z);
          if (path.length > 0) {
            this.currentPath = path;
          }
        }
      }
    }
  }

  private processPlayerAttack(room: MapRoomState, now: number) {
    if (!this.character || !this.targetId) return;
    const monster = room.monsters.get(this.targetId);
    if (!monster) {
      this.targetId = null;
      return;
    }

    const dist = getSqmDistance(monster.x, monster.z, this.playerPos.x, this.playerPos.z);
    const attackRange = this.getPlayerAttackRange();
    const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);

    if (dist <= attackRange && hasLoS) {
      if (now >= this.attackCooldownUntil) {
        const result = calculatePlayerAttack(this.character, monster.def);
        
        if (monster.defId === 'training_dummy') {
          monster.hp = monster.maxHp;
          monster.targetPlayerId = null;
        } else {
          monster.hp = Math.max(0, monster.hp - result.damage);
          monster.targetPlayerId = this.character.id;
        }

        // Process Equipment Enchantments (Vampirism, Void Leech, Fire Bonus)
        const equippedEnchants = Object.values(this.character.equipment)
          .map((eq) => eq?.enchantment)
          .filter(Boolean);

        for (const ench of equippedEnchants) {
          if (ench?.type === 'vampirism' && result.damage > 0) {
            const leech = Math.max(1, Math.floor(result.damage * 0.04));
            this.character.hp = Math.min(this.character.maxHp, this.character.hp + leech);
          } else if (ench?.type === 'void' && result.damage > 0) {
            const manaLeech = Math.max(1, Math.floor(result.damage * 0.03));
            this.character.mana = Math.min(this.character.maxMana, this.character.mana + manaLeech);
          } else if (ench?.type === 'fire' && result.damage > 0) {
            const bonusFire = Math.max(1, Math.floor(result.damage * 0.15));
            monster.hp = Math.max(0, monster.hp - bonusFire);
          }
        }

        const cooldownDuration = this.character.vocation === 'KNIGHT' ? 1200 : 1400;
        this.attackCooldownUntil = now + cooldownDuration;

        const voc = this.character.vocation;
        let vfxType: 'melee_slash' | 'arrow' | 'magic_energy' | 'magic_ice' = 'melee_slash';
        if (voc === 'PALADIN') vfxType = 'arrow';
        else if (voc === 'SORCERER') vfxType = 'magic_energy';
        else if (voc === 'DRUID') vfxType = 'magic_ice';

        const attackEvt: CombatEvent = {
          id: 'c_' + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          sourceId: this.character.id,
          targetId: monster.id,
          sourceX: this.playerPos.x,
          sourceY: 0.8,
          sourceZ: this.playerPos.z,
          x: monster.x,
          y: monster.y,
          z: monster.z,
          damage: result.damage,
          isCrit: result.isCrit,
          isBossHit: Boolean(monster.def.isBoss),
          isHeal: false,
          vfxType,
          color: result.color || (result.isCrit ? '#ff4500' : voc === 'SORCERER' ? '#c084fc' : voc === 'DRUID' ? '#38bdf8' : voc === 'PALADIN' ? '#facc15' : '#fef08a'),
        };
        this.pendingCombatEvents.push(attackEvt);
        if (partyNetwork.partyCode) {
          partyNetwork.broadcastCombatHit(attackEvt, monster.id, result.damage);
        }

        // Advance weapon skill
        if (this.character.vocation === 'KNIGHT') {
          this.character.skills.sword += 0.05;
        } else if (this.character.vocation === 'PALADIN') {
          this.character.skills.distance += 0.05;
        } else {
          this.character.skills.magic += 0.03;
        }

        if (monster.defId !== 'training_dummy' && monster.hp <= 0) {
          this.handleMonsterDeath(room, monster);
        }
      }
    }
  }

  private handleMonsterDeath(room: MapRoomState, monster: ActiveMonster) {
    if (!this.character) return;
    room.monsters.delete(monster.id);
    if (this.targetId === monster.id) {
      this.targetId = null;
    }

    // Award Exp & Gold with Dungeon Affix Multipliers
    let exp = monster.def.exp;
    let gold = Math.floor(monster.def.goldMin + Math.random() * (monster.def.goldMax - monster.def.goldMin + 1));
    const expMultiplier = 1 + (room.affix?.expBonusPct || 0) / 100;
    const goldMultiplier = 1 + (room.affix?.goldBonusPct || 0) / 100;
    const diffMult = room.difficulty === 'hard' ? 1.8 : room.difficulty === 'medium' ? 1.3 : 1.0;
    exp = Math.round(exp * expMultiplier * diffMult);
    gold = Math.round(gold * goldMultiplier * diffMult);
    this.character.killsCount = (this.character.killsCount || 0) + 1;

    if (partyNetwork.partyCode) {
      partyNetwork.broadcastMonsterDefeat(monster.id, exp, gold);
    }

    // Check if a Boss was defeated or a normal monster was killed
    if (monster.def.isBoss) {
      room.bossAlive = false;
      this.character.bossKills = (this.character.bossKills || 0) + 1;

      // Bonus rewards for boss completion
      const bonusExp = Math.round(exp * 1.5);
      const bonusGold = Math.round(gold * 1.5);
      exp += bonusExp;
      gold += bonusGold;

      if (room.def.mapType === 'dungeon') {
        room.portalOpen = true;
        const completedWave = room.wave;
        room.wave += 1;
        room.killsInWave = 0;
        room.targetKillsForBoss = Math.min(30, 8 + (room.wave - 1) * 2);

        if (!this.character.highestWaveCompleted) {
          this.character.highestWaveCompleted = {};
        }
        const prevBest = this.character.highestWaveCompleted[room.def.id] || 0;
        if (completedWave > prevBest) {
          this.character.highestWaveCompleted[room.def.id] = completedWave;
        }

        this.sendChatMessage(
          'Dungeon',
          `👑 [CHEFE DERROTADO] Você destruiu ${monster.def.name}! Onda ${completedWave} completada com êxito! (+${bonusExp} EXP, +${bonusGold} Ouro)`,
          'server',
          '#facc15'
        );
        this.sendChatMessage(
          'Dungeon',
          `🌀 [Portal das Profundezas Aberto] O portal para o Andar B${(room.floorNumber || 1) + 1} se abriu na Arena! Interaja com o portal para descer!`,
          'server',
          '#06b6d4'
        );

        this.onPacket({
          type: 'wave_transition',
          previousWave: completedWave,
          newWave: room.wave,
          bossDefeatedName: monster.def.name,
          mapName: room.def.name,
        });
      } else {
        // Open World Boss Defeated
        this.sendChatMessage(
          'Mundo Aberto',
          `👑 [CAMPEÃO ABATIDO] Você derrotou ${monster.def.name} na Zona de Caça! Recompensas épicas: +${bonusExp} EXP Bônus e +${bonusGold} Ouro!`,
          'server',
          '#f59e0b'
        );
      }
    } else {
      // Normal monster kill
      if (room.def.mapType === 'dungeon' && !room.bossAlive) {
        room.killsInWave += 1;
        if (room.killsInWave >= room.targetKillsForBoss) {
          room.killsInWave = room.targetKillsForBoss;
          this.spawnBoss(room);
        }
      }
    }

    this.character.experience += exp;
    this.character.gold += gold;

    // Track Hunt Mastery Milestone Progress!
    if (!this.character.huntMastery) {
      this.character.huntMastery = {};
    }
    const currentMapKills = (this.character.huntMastery[room.def.id] || 0) + 1;
    this.character.huntMastery[room.def.id] = currentMapKills;

    // Check if a milestone was reached
    for (const milestone of HUNT_MASTERY_TIERS) {
      if (currentMapKills === milestone.killsRequired) {
        this.recalculateMasteryBonuses(this.character, true);
        this.sendChatMessage(
          'Server',
          `🏆 [Zone Mastery] Você completou o Marco ${milestone.tier} (${milestone.name}) em ${room.def.name}! Bônus: ${milestone.bonusDescription}`,
          'server',
          '#fbbf24'
        );
      }
    }

    // Track Bestiary Kills & Mastery Progression
    if (!this.character.bestiaryKills) {
      this.character.bestiaryKills = {};
    }
    const prevMonsterKills = this.character.bestiaryKills[monster.def.id] || 0;
    const newMonsterKills = prevMonsterKills + 1;
    this.character.bestiaryKills[monster.def.id] = newMonsterKills;

    const bInfo = BESTIARY_DATABASE[monster.def.id];
    if (bInfo) {
      if (newMonsterKills === bInfo.tierRequirements.tier1) {
        this.sendChatMessage(
          'Bestiary',
          `📖 [Bestiário Desbloqueado] Tier I alcançado para ${bInfo.name}! (+3% Dano)`,
          'server',
          '#60a5fa'
        );
      } else if (newMonsterKills === bInfo.tierRequirements.tier2) {
        this.sendChatMessage(
          'Bestiary',
          `📖 [Bestiário Desbloqueado] Tier II alcançado para ${bInfo.name}! (+3% Dano & +3% Chance de Loot)`,
          'server',
          '#a855f7'
        );
      } else if (newMonsterKills === bInfo.tierRequirements.tier3) {
        this.sendChatMessage(
          'Bestiary',
          `👑 [Bestiário MESTRE] Tier III alcançado para ${bInfo.name}! (+10% Dano & +4% Crítico Máximo)`,
          'server',
          '#f59e0b'
        );
      }
    }

    // Classic Rune Charges Loot (35% chance to loot runes)
    if (!this.character.runeCharges) {
      this.character.runeCharges = { rune_sd: 8, rune_gfb: 15, rune_hmm: 25, rune_uh: 12 };
    }
    if (Math.random() < 0.35) {
      const runes = ['rune_hmm', 'rune_gfb', 'rune_uh', 'rune_sd'] as const;
      const weights = [0.4, 0.3, 0.2, 0.1];
      const roll = Math.random();
      let picked: typeof runes[number] = 'rune_hmm';
      let acc = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (roll <= acc) {
          picked = runes[i];
          break;
        }
      }
      const addCount = picked === 'rune_sd' ? 2 : picked === 'rune_uh' ? 3 : 5;
      this.character.runeCharges[picked] = (this.character.runeCharges[picked] || 0) + addCount;
      const runeSpell = SPELLS_DATABASE[picked];
      this.sendChatMessage('Loot', `✨ Você encontrou ${addCount}x ${runeSpell?.name || 'Runa'}!`, 'loot', runeSpell?.color || '#38bdf8');
    }

    // Check Daily Bounties Progress
    if (this.character.bounties) {
      for (const bounty of this.character.bounties) {
        if (!bounty.completed && bounty.targetMonsterDefId === monster.def.id) {
          bounty.currentKills += 1;
          if (bounty.currentKills >= bounty.requiredKills) {
            bounty.currentKills = bounty.requiredKills;
            bounty.completed = true;
            this.sendChatMessage(
              'Bounties',
              `🎖️ [MISSÃO CONCLUÍDA] "${bounty.title}"! Retorne a Thais e fale com o Capitão Harlan para receber +${bounty.rewardGold} Gold e +${bounty.rewardExp} EXP!`,
              'server',
              '#facc15'
            );
          } else {
            this.sendChatMessage(
              'Bounties',
              `🎯 [Bounty: ${bounty.title}] ${bounty.currentKills}/${bounty.requiredKills} ${bounty.targetMonsterName} derrotados.`,
              'server',
              '#38bdf8'
            );
          }
        }
      }
    }

    // Check Level Up
    const newLevel = getLevelFromExperience(this.character.experience);
    if (newLevel > this.character.level) {
      const voc = VOCATIONS[this.character.vocation];
      const diff = newLevel - this.character.level;
      this.character.level = newLevel;
      this.character.maxHp += voc.hpPerLevel * diff;
      this.character.maxMana += voc.manaPerLevel * diff;
      this.character.capacity += voc.capPerLevel * diff;
      this.character.hp = this.character.maxHp;
      this.character.mana = this.character.maxMana;
      this.character.experienceToNext = getExperienceForLevel(this.character.level + 1);

      this.onPacket({
        type: 'level_up',
        level: newLevel,
        hpGain: voc.hpPerLevel * diff,
        manaGain: voc.manaPerLevel * diff,
      });

      this.sendChatMessage('Server', `🎉 Parabéns! Você avançou para o Level ${newLevel}!`, 'server', '#fbbf24');
    }

    // Drop Loot on the Ground
    const lootedItemDefIds: string[] = [];
    for (const loot of monster.def.lootTable) {
      if (Math.random() <= loot.chance) {
        const itemDef = ITEMS_DATABASE[loot.defId];
        if (itemDef) {
          lootedItemDefIds.push(loot.defId);
          const dropId = 'drop_' + Math.random().toString(36).substring(2, 9);
          const count = Math.floor((loot.minCount || 1) + Math.random() * ((loot.maxCount || 1) - (loot.minCount || 1) + 1));
          room.drops.set(dropId, {
            id: dropId,
            defId: loot.defId,
            name: itemDef.name,
            x: monster.x + (Math.random() * 0.4 - 0.2),
            y: 0,
            z: monster.z + (Math.random() * 0.4 - 0.2),
            rarity: itemDef.rarity,
            count,
            createdAt: Date.now(),
          });
        }
      }
    }

    if (monster.def.isBoss) {
      this.onPacket({
        type: 'boss_victory',
        bossName: monster.def.name,
        expGained: exp,
        goldGained: gold,
        itemsLooted: lootedItemDefIds,
      });
    }

    this.sendChatMessage(
      'Server',
      `Derrotou ${monster.def.name}! Ganhou ${exp} EXP e ${gold} Gold.`,
      'loot',
      '#a3e635'
    );

    this.syncCharacter();
  }

  private processMonsters(room: MapRoomState, now: number) {
    if (room.def.isSafeZone || !this.character) return;

    // Synchronize bossAlive state with active monsters in the room
    let bossFound = false;
    for (const m of room.monsters.values()) {
      if (m.def.isBoss) {
        bossFound = true;
        break;
      }
    }
    room.bossAlive = bossFound;

    // In procedural dungeons, check if wave kill target is reached and boss needs to be summoned
    if (room.def.mapType === 'dungeon') {
      if (!room.bossAlive && room.killsInWave >= room.targetKillsForBoss && room.def.bossMonsterId) {
        this.spawnBoss(room);
      }
    }

    // Spawn replacement monsters up to room cap (Continuous respawn)
    const targetRoomCap = room.def.maxMonsters || (room.def.mapType === 'open_world' ? 14 : 7);
    if (room.monsters.size < targetRoomCap) {
      this.spawnRoomMonsters(room);
    }

    for (const monster of room.monsters.values()) {
      // Training dummies are static immovable objects
      if (monster.defId === 'training_dummy') {
        continue;
      }

      const distToPlayer = getSqmDistance(monster.x, monster.z, this.playerPos.x, this.playerPos.z);
      const distFromSpawn = getSqmDistance(monster.x, monster.z, monster.spawnX, monster.spawnZ);

      // Leash distance in SQMs: Max radius monster can stray from its designated spawn point
      const leashRadius = monster.def.isBoss ? 10 : 7;
      // Proximity detection radius in SQMs: aggros if player enters territorial vision range
      const detectionRange = monster.def.isBoss ? 8 : 5;
      const isDamaged = monster.hp < monster.maxHp;
      const isTargetedByPlayer = this.targetId === monster.id;

      // Aggro / Combat Decision
      if (monster.targetPlayerId) {
        // Active pursuit: Check if player ran away or pulled monster past its leash
        const deAggroDist = monster.def.isBoss ? 13 : 9;
        if (distFromSpawn > leashRadius || distToPlayer > deAggroDist) {
          // Leash broken: drop target, abandon pursuit and pathfind back to spawn!
          monster.targetPlayerId = null;
          monster.currentPath = [];
          const returnPath = findPath(room.grid, monster.x, monster.z, monster.spawnX, monster.spawnZ);
          if (returnPath.length > 0) {
            monster.currentPath = returnPath;
          }
        }
      } else {
        // Idle state: aggro if player enters vision / detection range with LoS, or takes damage / targeted
        const hasLoS = hasLineOfSight(room.grid, monster.x, monster.z, this.playerPos.x, this.playerPos.z);
        const shouldAggro = ((distToPlayer <= detectionRange && hasLoS) || isDamaged || isTargetedByPlayer) && distFromSpawn <= leashRadius + 1;
        if (shouldAggro) {
          monster.targetPlayerId = this.character.id;
          monster.currentPath = [];
        } else {
          // Active Patrol around spawn area (constantly pacing/moving in territory)
          if (distFromSpawn > 4 && monster.currentPath.length === 0) {
            // Stray monster returning to its anchor territory
            const returnPath = findPath(room.grid, monster.x, monster.z, monster.spawnX, monster.spawnZ);
            if (returnPath.length > 0) {
              monster.currentPath = returnPath;
            }
          } else if (!monster.nextPatrolTime || now >= monster.nextPatrolTime) {
            // Schedule short pause between patrol strolls so monsters stay in motion
            monster.nextPatrolTime = now + 600 + Math.random() * 1000;
            if (monster.currentPath.length === 0) {
              // Pick an active patrol point in its territory (1 to 3 SQMs away)
              const angle = Math.random() * Math.PI * 2;
              const patrolDist = 1 + Math.floor(Math.random() * 3);
              const targetTileX = Math.floor(monster.spawnX + Math.cos(angle) * patrolDist);
              const targetTileZ = Math.floor(monster.spawnZ + Math.sin(angle) * patrolDist);

              if (isWalkable(room.grid, targetTileX, targetTileZ)) {
                const p = findPath(room.grid, monster.x, monster.z, targetTileX + 0.5, targetTileZ + 0.5);
                if (p.length > 0 && p.length <= 5) {
                  monster.currentPath = p;
                }
              }
            }
          }
        }
      }

      if (monster.targetPlayerId) {
        const monsterAttackRange = getMonsterAttackRange(monster.def);
        const hasLoS = hasLineOfSight(room.grid, monster.x, monster.z, this.playerPos.x, this.playerPos.z);
        const isRangedMonster = monster.def.isRanged || (monster.def.spells && monster.def.spells.length > 0 && monsterAttackRange > 1);

        // Move / Chase player if out of attack range OR if obstructed by wall
        if (distToPlayer > monsterAttackRange || !hasLoS) {
          const pathEnd = monster.currentPath.length > 0 ? monster.currentPath[monster.currentPath.length - 1] : null;
          const distFromPathEndToPlayer = pathEnd ? getSqmDistance(pathEnd.x, pathEnd.z, this.playerPos.x, this.playerPos.z) : 999;

          if (monster.currentPath.length === 0 || distFromPathEndToPlayer > 1) {
            const path = findPath(room.grid, monster.x, monster.z, this.playerPos.x, this.playerPos.z);
            if (path.length > 0) {
              monster.currentPath = path;
            }
          }
        } else if (isRangedMonster && distToPlayer <= 2 && distFromSpawn < leashRadius) {
          // Ranged monster tactical kiting: maintain safe distance from melee player!
          if (monster.currentPath.length === 0) {
            const otherMonsters = Array.from(room.monsters.values())
              .filter((m) => m.id !== monster.id)
              .map((m) => ({ x: m.x, z: m.z }));
            const kiteStep = findKiteStep(room.grid, monster.x, monster.z, this.playerPos.x, this.playerPos.z, {
              dangerDistance: 2,
              desiredDistance: 3,
              maxDistance: monsterAttackRange,
              otherObstacles: otherMonsters,
            });
            if (kiteStep) {
              monster.currentPath = [kiteStep];
            }
          }
        } else {
          // Inside attack range and has line of sight: hold position and attack
          monster.currentPath = [];
          monster.x = snapToSqm(monster.x);
          monster.z = snapToSqm(monster.z);
        }

        // Monster Melee / Basic Attack
        if (distToPlayer <= monsterAttackRange && hasLoS && now >= monster.attackCooldownUntil) {
          const res = calculateMonsterAttack(monster.def, this.character);
          this.character.hp = Math.max(0, this.character.hp - res.damage);
          monster.attackCooldownUntil = now + 1400; // 1.4s dynamic attack cadence

          this.pendingCombatEvents.push({
            id: 'c_' + Math.random().toString(36).substring(2, 9),
            timestamp: now,
            sourceId: monster.id,
            targetId: this.character.id,
            x: this.playerPos.x,
            y: this.playerPos.y,
            z: this.playerPos.z,
            damage: res.damage,
            isCrit: false,
            isBossHit: Boolean(monster.def.isBoss),
            isBlocked: Boolean(res.isBlocked),
            isHeal: false,
            color: res.isBlocked ? '#38bdf8' : '#ef4444',
          });

          // Defending skill progress
          this.character.skills.shielding += 0.04;

          if (this.character.hp <= 0) {
            this.handlePlayerDeath(room);
          }
        }

        // Monster Spell / Special Attack (Bosses and magical beasts)
        if (monster.def.isBoss && now >= (monster.telegraphTimer || 0) + 7000 && distToPlayer <= 10) {
          monster.telegraphTimer = now;
          const telegraphId = 'hz_tg_' + Math.random().toString(36).substring(2, 9);

          const attackTypes = [
            { type: 'boss_telegraph_meteor', spellName: 'CHUVA DE METEOROS DÉSTRUTIVA', radius: 3.5, color: '#f97316' },
            { type: 'boss_telegraph_slam', spellName: 'PISOTÃO TERREMOTO ÉPICO', radius: 4.0, color: '#ef4444' },
            { type: 'boss_telegraph_deathwave', spellName: 'ONDA DA MORTE AVASSALADORA', radius: 3.0, color: '#a855f7' },
          ] as const;

          const chosenAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];

          this.sendChatMessage(
            'BOSS',
            `⚠️ [TELEGRAPH] ${monster.def.name} está canalizando "${chosenAttack.spellName}"! SAIA DA ÁREA DE PERIGO (1.6s)!`,
            'server',
            chosenAttack.color
          );

          room.hazards.set(telegraphId, {
            id: telegraphId,
            x: this.playerPos.x,
            z: this.playerPos.z,
            type: chosenAttack.type,
            radius: chosenAttack.radius,
            durationMs: 1600,
            createdAt: now,
            damagePerTick: 0,
            lastTickAt: now,
            isTelegraph: true,
            detonatesInMs: 1600,
            spellName: chosenAttack.spellName,
          });
        }

        if (monster.def.spells && monster.def.spells.length > 0 && now >= (monster.spellCooldownUntil || 0) && distToPlayer <= 6 && hasLoS) {
          for (const sp of monster.def.spells) {
            if (Math.random() <= sp.chance) {
              monster.spellCooldownUntil = now + (monster.def.isBoss ? 3500 : 5000);
              const spellDamage = Math.floor(sp.damage * (0.85 + Math.random() * 0.3));
              this.character.hp = Math.max(0, this.character.hp - spellDamage);

              this.pendingCombatEvents.push({
                id: 'm_sp_' + Math.random().toString(36).substring(2, 9),
                timestamp: now,
                sourceId: monster.id,
                targetId: this.character.id,
                x: this.playerPos.x,
                y: this.playerPos.y,
                z: this.playerPos.z,
                damage: spellDamage,
                isCrit: true,
                isBossHit: Boolean(monster.def.isBoss),
                spellWords: sp.name,
                vfxType: sp.isAoe ? 'boss_smash' : 'magic_fire',
                color: sp.color,
              });

              this.sendChatMessage(
                monster.def.name,
                `🔥 ${sp.name}! Causou ${spellDamage} de dano!`,
                'say',
                sp.color
              );

              // Boss Hazard ground creation
              if (monster.def.isBoss) {
                const isPoisonBoss = monster.def.id === 'rotworm_queen';
                const hazType = isPoisonBoss ? 'poison' : 'fire';
                const hId = 'haz_boss_' + Math.random().toString(36).substring(2, 9);
                room.hazards.set(hId, {
                  id: hId,
                  type: hazType,
                  x: this.playerPos.x,
                  y: 0.05,
                  z: this.playerPos.z,
                  radius: isPoisonBoss ? 2.4 : 2.6,
                  durationMs: 7000,
                  createdAt: now,
                  damagePerTick: isPoisonBoss ? 16 : 24,
                  lastTickAt: now,
                });
                this.sendChatMessage(
                  monster.def.name,
                  isPoisonBoss
                    ? `☣️ ${monster.def.name} espalhou uma poça de ácido venenoso no chão!`
                    : `🔥 ${monster.def.name} incendiou a arena com brasas de fogo!`,
                  'say',
                  isPoisonBoss ? '#22c55e' : '#f97316'
                );
              }

              if (this.character.hp <= 0) {
                this.handlePlayerDeath(room);
              }
              break;
            }
          }
        }
      }

      // SQM Monster movement step
      if (monster.currentPath.length > 0) {
        const stepMs = getMonsterStepDurationMs(monster.def.speed);
        const tilesPerSec = 1000 / stepMs;
        let remainingSpeed = tilesPerSec * 0.05;

        while (remainingSpeed > 0 && monster.currentPath.length > 0) {
          const next = monster.currentPath[0];
          const nextTileX = Math.floor(next.x);
          const nextTileZ = Math.floor(next.z);

          // SQM non-overlapping check: prevent monsters from overlapping on the exact same tile
          let occupiedByMonster = false;
          for (const otherM of room.monsters.values()) {
            if (otherM.id !== monster.id && Math.floor(otherM.x) === nextTileX && Math.floor(otherM.z) === nextTileZ) {
              occupiedByMonster = true;
              break;
            }
          }
          if (occupiedByMonster) {
            break;
          }

          const dx = next.x - monster.x;
          const dz = next.z - monster.z;
          const d = Math.hypot(dx, dz);

          if (d <= remainingSpeed || d < 0.01) {
            monster.x = next.x;
            monster.z = next.z;
            remainingSpeed -= Math.max(0.01, d);
            monster.currentPath.shift();
          } else {
            monster.x += (dx / d) * remainingSpeed;
            monster.z += (dz / d) * remainingSpeed;
            remainingSpeed = 0;
          }
        }
      } else {
        monster.x = snapToSqm(monster.x);
        monster.z = snapToSqm(monster.z);
      }
    }
  }

  private processHazards(room: MapRoomState, now: number) {
    if (!this.character || !room.hazards) return;

    for (const [id, hazard] of Array.from(room.hazards.entries())) {
      const elapsed = now - hazard.createdAt;

      if (hazard.isTelegraph) {
        if (elapsed >= (hazard.detonatesInMs || 1600)) {
          const distToPlayer = getSqmDistance(this.playerPos.x, this.playerPos.z, hazard.x, hazard.z);

          if (distToPlayer <= hazard.radius) {
            const rawDmg = Math.floor(180 + Math.random() * 120);
            const reducedDmg = this.character.stance === 'full_defense' ? Math.floor(rawDmg * 0.65) : rawDmg;

            this.character.hp = Math.max(0, this.character.hp - reducedDmg);
            this.sendChatMessage(
              'BOSS',
              `💥 [IMPACTO] Você foi atingido por "${hazard.spellName || 'Explosão do Chefe'}" (-${reducedDmg} HP)!`,
              'server',
              '#ef4444'
            );

            this.pendingCombatEvents.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              timestamp: now,
              sourceId: 'boss_aoe',
              targetId: this.character.id,
              x: this.playerPos.x,
              y: this.playerPos.y,
              z: this.playerPos.z,
              damage: reducedDmg,
              isCrit: true,
              isBossHit: true,
              isBlocked: false,
              isHeal: false,
              color: '#ef4444',
            });

            if (this.character.hp <= 0) {
              this.handlePlayerDeath(room);
            }
          } else {
            this.sendChatMessage(
              'Combat',
              `⚡ [ESQUIVA PERFEITA] Você desviou da área de "${hazard.spellName || 'Impacto'}" a tempo!`,
              'server',
              '#22c55e'
            );
          }

          room.hazards.delete(id);
        }
      } else {
        if (now - hazard.createdAt >= hazard.durationMs) {
          room.hazards.delete(id);
        } else if (now - hazard.lastTickAt >= 1000) {
          hazard.lastTickAt = now;
          const distToPlayer = getSqmDistance(this.playerPos.x, this.playerPos.z, hazard.x, hazard.z);
          if (distToPlayer <= hazard.radius && hazard.damagePerTick > 0) {
            this.character.hp = Math.max(0, this.character.hp - hazard.damagePerTick);
            if (this.character.hp <= 0) {
              this.handlePlayerDeath(room);
            }
          }
        }
      }
    }
  }

  private handlePlayerDeath(room: MapRoomState) {
    if (!this.character) return;
    this.sendChatMessage('Server', `💀 Você foi derrotado! Retornando ao Templo de Thais...`, 'server', '#ef4444');

    // Clean up previous dungeon room from memory
    if (this.currentMapId !== 'HUB_THAIS') {
      const oldRoom = this.rooms.get(this.currentMapId);
      if (oldRoom) {
        oldRoom.monsters.clear();
        oldRoom.drops.clear();
        oldRoom.hazards.clear();
        oldRoom.breakables.clear();
        this.rooms.delete(this.currentMapId);
      }
    }

    // Teleport back to safe zone Thais
    this.currentMapId = 'HUB_THAIS';
    const hubRoom = this.rooms.get('HUB_THAIS') || this.createHubRoom();
    this.playerPos = { x: hubRoom.grid.spawnPoint.x, y: 0, z: hubRoom.grid.spawnPoint.z };
    this.currentPath = [];
    this.targetId = null;
    this.isAutoHunting = false;
    this.character.autoHuntActive = false;
    this.onPacket({ type: 'autohunt_sync', enabled: false });
    this.character.hp = Math.floor(this.character.maxHp * 0.5);
    this.character.currentMapId = 'HUB_THAIS';
    this.syncCharacter();
  }

  private processDrops(room: MapRoomState) {
    if (!this.character) return;
    for (const [dropId, drop] of room.drops.entries()) {
      // Coleta automática instantânea sem precisar andar até o item caído
      if (this.character.inventory.length < 24) {
        room.drops.delete(dropId);
        const itemDef = ITEMS_DATABASE[drop.defId];

        if (itemDef) {
          const existing = this.character.inventory.find((i) => i.defId === drop.defId && itemDef.stackable);
          if (existing) {
            existing.count += drop.count;
          } else {
            this.character.inventory.push({
              instanceId: 'item_' + Math.random().toString(36).substring(2, 9),
              defId: drop.defId,
              count: drop.count,
            });
          }

          this.onPacket({
            type: 'loot_received',
            itemDefId: drop.defId,
            count: drop.count,
            gold: 0,
            rarity: drop.rarity,
          });

          this.syncCharacter();
        }
      }
    }
  }

  private spawnRoomMonsters(room: MapRoomState) {
    const diff = room.difficulty || 'medium';
    const maxMobs = diff === 'easy' ? 3 : diff === 'hard' ? 8 : 5;
    if (room.monsters.size >= maxMobs && !room.def.isSafeZone) return;

    const pool = room.def.monsterSpawnPool;
    if (!pool || pool.length === 0) return;

    // Pick weighted monster
    const rand = Math.random() * 100;
    let acc = 0;
    let chosenId = pool[0].monsterId;
    for (const p of pool) {
      acc += p.weight;
      if (rand <= acc) {
        chosenId = p.monsterId;
        break;
      }
    }

    const def = MONSTERS_DATABASE[chosenId];
    if (!def) return;

    let spawnX: number | undefined;
    let spawnZ: number | undefined;

    // Hard difficulty box closing: surround player if count < 8 (and player is away from spawn point)
    const distToPlayerSpawn = room.grid.spawnPoint ? Math.hypot(this.playerPos.x - room.grid.spawnPoint.x, this.playerPos.z - room.grid.spawnPoint.z) : 999;
    if (diff === 'hard' && room.monsters.size < 8 && distToPlayerSpawn >= 3.5 && Math.random() < 0.7) {
      const offsets = [
        { dx: -1, dz: -1 }, { dx: 0, dz: -1 }, { dx: 1, dz: -1 },
        { dx: -1, dz: 0 },                    { dx: 1, dz: 0 },
        { dx: -1, dz: 1 },  { dx: 0, dz: 1 },  { dx: 1, dz: 1 },
      ];
      const freeOffsets = offsets.filter(off => {
        const tx = Math.floor(this.playerPos.x) + off.dx;
        const tz = Math.floor(this.playerPos.z) + off.dz;
        if (!isWalkable(room.grid, tx, tz)) return false;
        if (room.grid.spawnPoint && Math.hypot(tx + 0.5 - room.grid.spawnPoint.x, tz + 0.5 - room.grid.spawnPoint.z) < 3.5) return false;
        for (const m of room.monsters.values()) {
          if (Math.floor(m.x) === tx && Math.floor(m.z) === tz) return false;
        }
        return true;
      });
      if (freeOffsets.length > 0) {
        const chosenOff = freeOffsets[Math.floor(Math.random() * freeOffsets.length)];
        spawnX = Math.floor(this.playerPos.x) + chosenOff.dx + 0.5;
        spawnZ = Math.floor(this.playerPos.z) + chosenOff.dz + 0.5;
      }
    }

    if (spawnX === undefined || spawnZ === undefined) {
      const spawnPt = room.grid.spawnPoint || { x: 16.5, z: 27.5 };
      if (room.grid.staticSpawnNodes && room.grid.staticSpawnNodes.length > 0) {
        const validNodes = room.grid.staticSpawnNodes.filter(node => Math.hypot(node.x - spawnPt.x, node.z - spawnPt.z) >= 4.0);
        const candidateNodes = validNodes.length > 0 ? validNodes : room.grid.staticSpawnNodes;

        const freeNodes = candidateNodes.filter((node) => {
          for (const m of room.monsters.values()) {
            if (Math.floor(m.x) === Math.floor(node.x) && Math.floor(m.z) === Math.floor(node.z)) return false;
          }
          return true;
        });
        const chosen = freeNodes.length > 0
          ? freeNodes[Math.floor(Math.random() * freeNodes.length)]
          : candidateNodes[Math.floor(Math.random() * candidateNodes.length)];
        spawnX = chosen.x;
        spawnZ = chosen.z;
      } else {
        const walkableTiles: Array<{ x: number; z: number }> = [];
        for (let z = 2; z < room.grid.height - 2; z++) {
          for (let x = 2; x < room.grid.width - 2; x++) {
            if (isWalkable(room.grid, x, z)) {
              if (Math.hypot(x + 0.5 - spawnPt.x, z + 0.5 - spawnPt.z) < 4.0) continue;

              let occupied = false;
              for (const m of room.monsters.values()) {
                if (Math.floor(m.x) === x && Math.floor(m.z) === z) {
                  occupied = true;
                  break;
                }
              }
              if (!occupied) {
                walkableTiles.push({ x, z });
              }
            }
          }
        }
        if (walkableTiles.length === 0) {
          for (let z = 2; z < room.grid.height - 2; z++) {
            for (let x = 2; x < room.grid.width - 2; x++) {
              if (isWalkable(room.grid, x, z)) walkableTiles.push({ x, z });
            }
          }
        }
        if (walkableTiles.length === 0) return;
        const tile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
        spawnX = tile.x + 0.5;
        spawnZ = tile.z + 0.5;
      }
    }

    const statMult = diff === 'easy' ? 0.8 : diff === 'hard' ? 1.3 : 1.0;
    const scaledHp = Math.round(def.maxHp * statMult);

    const id = 'm_' + Math.random().toString(36).substring(2, 9);
    room.monsters.set(id, {
      id,
      defId: chosenId,
      def,
      mapId: room.def.id,
      x: spawnX,
      y: 0,
      z: spawnZ,
      spawnX,
      spawnZ,
      currentPath: [],
      hp: scaledHp,
      maxHp: scaledHp,
      targetPlayerId: null,
      attackCooldownUntil: 0,
      spellCooldownUntil: 0,
      telegraph: null,
      telegraphTimer: 0,
      nextPatrolTime: Date.now() + 300 + Math.random() * 800,
    });
  }

  private spawnSeededMonsters(room: MapRoomState, spawns: SeededMonsterSpawn[]) {
    const pool = room.def.monsterSpawnPool;
    if (!pool || pool.length === 0) return;

    for (let i = 0; i < spawns.length; i++) {
      const sp = spawns[i];
      const p = pool[i % pool.length];
      const def = MONSTERS_DATABASE[p.monsterId];
      if (!def) continue;

      room.monsters.set(sp.id, {
        id: sp.id,
        defId: p.monsterId,
        def,
        mapId: room.def.id,
        x: sp.x,
        y: 0,
        z: sp.z,
        spawnX: sp.x,
        spawnZ: sp.z,
        currentPath: [],
        hp: def.maxHp,
        maxHp: def.maxHp,
        targetPlayerId: null,
        attackCooldownUntil: 0,
        spellCooldownUntil: 0,
        telegraph: null,
        telegraphTimer: 0,
        nextPatrolTime: Date.now() + 300 + Math.random() * 800,
      });
    }
  }

  private spawnBoss(room: MapRoomState) {
    if (room.bossAlive || !room.def.bossMonsterId) return;
    const bossDef = MONSTERS_DATABASE[room.def.bossMonsterId];
    if (!bossDef) return;

    room.bossAlive = true;

    // Pick location in boss chamber (last room in grid.rooms)
    let spawnX = room.def.id === 'HUNT_SEWERS' ? 24.5 : 26.5;
    let spawnZ = room.def.id === 'HUNT_SEWERS' ? 23.5 : 25.5;

    if (room.grid.rooms && room.grid.rooms.length > 0) {
      const bossRoom = room.grid.rooms[room.grid.rooms.length - 1];
      spawnX = Math.floor(bossRoom.x + bossRoom.w / 2) + 0.5;
      spawnZ = Math.floor(bossRoom.z + bossRoom.h / 2) + 0.5;
    }

    // Ensure walkable tile
    if (!isWalkable(room.grid, Math.floor(spawnX), Math.floor(spawnZ))) {
      let foundWalkable = false;
      for (let dz = -3; dz <= 3 && !foundWalkable; dz++) {
        for (let dx = -3; dx <= 3 && !foundWalkable; dx++) {
          const testX = Math.floor(spawnX + dx);
          const testZ = Math.floor(spawnZ + dz);
          if (isWalkable(room.grid, testX, testZ)) {
            spawnX = testX + 0.5;
            spawnZ = testZ + 0.5;
            foundWalkable = true;
          }
        }
      }
    }

    const bossId = 'boss_' + room.def.bossMonsterId + '_' + Date.now();
    const waveScale = 1 + (room.wave - 1) * 0.2;
    const bossMaxHp = Math.round(bossDef.maxHp * waveScale);
    const scaledDef: MonsterDef = {
      ...bossDef,
      maxHp: bossMaxHp,
      attack: Math.round(bossDef.attack * (1 + (room.wave - 1) * 0.1)),
      exp: Math.round(bossDef.exp * waveScale),
      goldMin: Math.round(bossDef.goldMin * waveScale),
      goldMax: Math.round(bossDef.goldMax * waveScale),
    };

    const bossMonster: ActiveMonster = {
      id: bossId,
      defId: room.def.bossMonsterId,
      def: scaledDef,
      mapId: room.def.id,
      x: spawnX,
      y: 0,
      z: spawnZ,
      spawnX,
      spawnZ,
      currentPath: [],
      hp: bossMaxHp,
      maxHp: bossMaxHp,
      targetPlayerId: null, // Guard boss arena calmly until challenged or player enters range
      attackCooldownUntil: Date.now() + 1000,
      spellCooldownUntil: Date.now() + 2500,
      telegraph: null,
      telegraphTimer: 0,
      nextPatrolTime: Date.now() + 600 + Math.random() * 800,
    };

    room.monsters.set(bossId, bossMonster);

    // Broadcast Boss Spawn
    this.sendChatMessage(
      'Server',
      `🚨 [ALERTA DE BOSS] A meta da Onda ${room.wave} foi alcançada! ${bossDef.name} surgiu nas profundezas!`,
      'server',
      '#ef4444'
    );
    this.sendChatMessage(
      'Server',
      `💀 Derrote ${bossDef.name} para avançar para a próxima onda e conquistar tesouros raros!`,
      'server',
      '#f97316'
    );

    // Notify client of boss awakening
    this.onPacket({
      type: 'boss_spawned',
      wave: room.wave,
      bossName: bossDef.name,
    });

    // Visual Boss Spawn Event
    this.pendingCombatEvents.push({
      id: 'boss_smash_' + Date.now(),
      timestamp: Date.now(),
      sourceId: bossId,
      targetId: bossId,
      x: spawnX,
      y: 0,
      z: spawnZ,
      damage: 0,
      isCrit: true,
      isBossHit: true,
      vfxType: 'boss_smash',
      color: '#ef4444',
    });

    // Auto-hunt immediately acquires boss
    if (this.isAutoHunting && this.character) {
      this.targetId = bossId;
      const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, spawnX, spawnZ);
      if (path.length > 0) {
        this.currentPath = path;
      }
    }
  }

  // Client Action Handlers
  public handleClientPacket(packet: ClientPacket) {
    if (!this.character) return;
    const room = this.rooms.get(this.currentMapId) || this.rooms.get('HUB_THAIS')!;

    switch (packet.type) {
      case 'move': {
        this.targetId = null;
        this.continuousVelocity.active = false;
        // In Diablo 3: move smoothly to target clicked coordinate
        const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, packet.x, packet.z);
        if (hasLoS && isPositionWalkableCircle(room.grid, packet.x, packet.z, 0.25)) {
          this.clickMoveTarget = { x: packet.x, z: packet.z };
          this.currentPath = [];
        } else {
          this.clickMoveTarget = null;
          const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, packet.x, packet.z);
          if (path.length > 0) {
            this.currentPath = path;
          }
        }
        const dx = packet.x - this.playerPos.x;
        const dz = packet.z - this.playerPos.z;
        if (Math.hypot(dx, dz) > 0.05) {
          this.playerRotation = Math.atan2(dx, dz);
        }
        break;
      }
      case 'move_direction': {
        this.clickMoveTarget = null;
        this.currentPath = [];
        this.playerRotation = Math.atan2(packet.dx, packet.dz);
        this.continuousVelocity = {
          vx: packet.dx,
          vz: packet.dz,
          active: true,
        };
        break;
      }
      case 'move_continuous': {
        this.clickMoveTarget = null;
        this.continuousVelocity = {
          vx: packet.vx,
          vz: packet.vz,
          active: packet.isMoving,
        };
        if (packet.isMoving && Math.hypot(packet.vx, packet.vz) > 0.05) {
          this.playerRotation = Math.atan2(packet.vx, packet.vz);
          this.currentPath = [];
        }
        if (packet.faceX !== undefined && packet.faceZ !== undefined) {
          this.playerRotation = Math.atan2(packet.faceX, packet.faceZ);
        }
        break;
      }
      case 'dash': {
        const now = Date.now();
        if (now - this.lastDashTime < 1800) {
          this.sendChatMessage('Combat', '⌛ Dash recarregando...', 'server', '#a855f7');
          break;
        }

        const dashTiles = 5.0;
        let dashAngle = this.playerRotation;
        if (this.continuousVelocity.active && Math.hypot(this.continuousVelocity.vx, this.continuousVelocity.vz) > 0.1) {
          dashAngle = Math.atan2(this.continuousVelocity.vx, this.continuousVelocity.vz);
        }

        const dx = Math.sin(dashAngle);
        const dz = Math.cos(dashAngle);

        const startX = this.playerPos.x;
        const startZ = this.playerPos.z;
        let finalX = startX;
        let finalZ = startZ;

        const steps = 25;
        for (let i = 1; i <= steps; i++) {
          const stepDist = (dashTiles * i) / steps;
          const checkX = startX + dx * stepDist;
          const checkZ = startZ + dz * stepDist;
          if (isPositionWalkableCircle(room.grid, checkX, checkZ, 0.25)) {
            finalX = checkX;
            finalZ = checkZ;
          } else {
            break; // Hit a wall
          }
        }

        if (Math.hypot(finalX - startX, finalZ - startZ) > 0.4) {
          this.lastDashTime = now;
          this.dashMomentumUntil = now + 350; // Continuous momentum glide right out of the dash
          this.playerPos.x = finalX;
          this.playerPos.z = finalZ;
          this.currentPath = [];

          // Keep click target if still ahead, otherwise clear
          if (this.clickMoveTarget) {
            if (Math.hypot(this.clickMoveTarget.x - finalX, this.clickMoveTarget.z - finalZ) <= 0.3) {
              this.clickMoveTarget = null;
            }
          }
          // Note: continuousVelocity is preserved so holding WASD / cursor never pauses!

          this.pendingCombatEvents.push({
            id: 'd_' + Math.random().toString(36).substring(2, 9),
            timestamp: now,
            sourceId: this.character.id,
            targetId: this.character.id,
            damage: 0,
            vfxType: 'spectral_dash',
            x: this.playerPos.x,
            y: this.playerPos.y,
            z: this.playerPos.z,
            sourceX: startX,
            sourceY: this.playerPos.y,
            sourceZ: startZ,
          });

          this.syncCharacter();
        }
        break;
      }
      case 'select_target': {
        let selectedId = packet.targetId;
        if (selectedId === 'AUTO') {
          let nearestDist = 16;
          let nearestMonsterId: string | null = null;
          let nearestHasLoS = false;
          for (const [mId, m] of room.monsters.entries()) {
            if (m.hp <= 0) continue;
            const dist = getSqmDistance(m.x, m.z, this.playerPos.x, this.playerPos.z);
            const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z);
            if (dist <= nearestDist) {
              if (hasLoS || !nearestHasLoS) {
                nearestDist = dist;
                nearestMonsterId = mId;
                nearestHasLoS = hasLoS;
              }
            }
          }
          selectedId = nearestMonsterId;
        }

        this.targetId = selectedId;
        if (this.targetId && room.monsters.has(this.targetId)) {
          const monster = room.monsters.get(this.targetId)!;
          const dist = getSqmDistance(this.playerPos.x, this.playerPos.z, monster.x, monster.z);
          const attackRange = this.getPlayerAttackRange();
          const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);

          // If out of range OR obstructed by wall, automatically walk towards monster
          if (dist > attackRange || !hasLoS) {
            const path = findPath(room.grid, this.playerPos.x, this.playerPos.z, monster.x, monster.z);
            if (path.length > 0) {
              this.currentPath = path;
            }
          } else {
            // Already in range with clear line of sight -> clear path and fire attack immediately if cooldown ready
            this.currentPath = [];
            this.playerPos.x = snapToSqm(this.playerPos.x);
            this.playerPos.z = snapToSqm(this.playerPos.z);
            this.processPlayerAttack(room, Date.now());
          }
        } else if (!this.targetId) {
          // Deselected target -> stop chasing
          this.currentPath = [];
        }
        break;
      }
      case 'toggle_autohunt': {
        this.isAutoHunting = packet.enabled;
        if (!this.isAutoHunting) {
          this.currentPath = [];
          this.targetId = null;
        }
        if (this.character) {
          this.character.autoHuntActive = this.isAutoHunting;
        }
        this.onPacket({ type: 'autohunt_sync', enabled: this.isAutoHunting });
        this.syncCharacter();
        break;
      }
      case 'switch_map': {
        this.switchMap(packet.mapId, packet.difficulty);
        break;
      }
      case 'cast_spell': {
        this.castSpell(packet.spellId, packet.aimX, packet.aimZ, packet.targetId);
        break;
      }
      case 'use_potion': {
        this.usePotion(packet.potionType);
        break;
      }
      case 'equip_item': {
        this.equipItem(packet.instanceId, packet.slot);
        break;
      }
      case 'unequip_item': {
        this.unequipItem(packet.slot);
        break;
      }
      case 'drop_or_sell_item': {
        this.dropOrSellItem(packet.instanceId);
        break;
      }
      case 'buy_item': {
        this.buyItem(packet.itemDefId, packet.count);
        break;
      }
      case 'stash_deposit': {
        this.stashDeposit(packet.instanceId);
        break;
      }
      case 'stash_withdraw': {
        this.stashWithdraw(packet.instanceId);
        break;
      }
      case 'bounty_claim': {
        this.bountyClaim(packet.bountyId);
        break;
      }
      case 'rest_at_shrine': {
        this.character.hp = this.character.maxHp;
        this.character.mana = this.character.maxMana;
        this.sendChatMessage('Server', '✨ As energias sagradas do Templo restauraram sua Vida e Mana!', 'server', '#10b981');
        this.syncCharacter();
        break;
      }
      case 'change_vocation': {
        this.changeVocation(packet.vocation);
        break;
      }
      case 'set_stance': {
        if (packet.stance && ['full_attack', 'balanced', 'full_defense'].includes(packet.stance)) {
          this.character.stance = packet.stance;
          this.sendChatMessage('Server', `🛡️ Postura de combate alterada para: ${packet.stance === 'full_attack' ? '⚔️ ATAQUE TOTAL (1.25x Dano)' : packet.stance === 'full_defense' ? '🛡️ DEFESA TOTAL (0.65x Dano & +35% Bloqueio)' : '⚖️ EQUILIBRADO'}`, 'server', '#38bdf8');
          this.syncCharacter();
        }
        break;
      }
      case 'enchant_item': {
        const item = this.character.inventory.find((i) => i.instanceId === packet.instanceId) ||
                     Object.values(this.character.equipment).find((i) => i?.instanceId === packet.instanceId);

        if (!item) return;

        const enchantmentsDef: Record<string, any> = {
          fire: { id: 'fire', name: 'Runa do Fogo Ancestral', bonusText: '+15% Dano de Fogo', type: 'fire', color: '#f97316', costGold: 400 },
          crit: { id: 'crit', name: 'Runa da Tempestade', bonusText: '+10% Chance de Crítico', type: 'crit', color: '#facc15', costGold: 500 },
          vampirism: { id: 'vampirism', name: 'Runa Vampírica', bonusText: '+4% Roubo de Vida por golpe', type: 'vampirism', color: '#ef4444', costGold: 600 },
          void: { id: 'void', name: 'Runa Drenadora do Vazio', bonusText: '+3% Roubo de Mana por golpe', type: 'void', color: '#c084fc', costGold: 600 },
          aegis: { id: 'aegis', name: 'Runa Protetora de Aegis', bonusText: '+12 Defesa & Shielding', type: 'aegis', color: '#38bdf8', costGold: 500 },
        };

        const ench = enchantmentsDef[packet.enchantmentId];
        if (!ench) return;

        if (this.character.gold < ench.costGold) {
          this.sendChatMessage('Server', '⚠️ Ouro insuficiente para encantar este equipamento!', 'server', '#ef4444');
          return;
        }

        this.character.gold -= ench.costGold;
        item.enchantment = {
          id: ench.id,
          name: ench.name,
          bonusText: ench.bonusText,
          type: ench.type,
          color: ench.color,
        };

        const itemDef = ITEMS_DATABASE[item.defId];
        this.sendChatMessage('Server', `✨ [ENCANTAMENTO RÚNICO] ${itemDef?.name || 'Item'} foi imbuído com ${ench.name} (${ench.bonusText})!`, 'server', ench.color);
        this.syncCharacter();
        break;
      }
      case 'reset_character': {
        this.resetCharacter(packet.characterName, packet.vocation);
        break;
      }
      case 'chat': {
        if (!packet.text?.trim()) return;
        const text = packet.text.trim().substring(0, 150);
        const lowerText = text.toLowerCase().trim();

        // Check if message matches any spell words or light shortcuts
        const matchedSpell = Object.values(SPELLS_DATABASE).find(
          (sp) => sp.words.toLowerCase() === lowerText || sp.id.toLowerCase() === lowerText
        );

        if (matchedSpell) {
          this.castSpell(matchedSpell.id);
        } else if (lowerText === 'luz' || lowerText === '/light' || lowerText === 'light' || lowerText === 'lampada') {
          this.castSpell('utevo_lux');
        }

        if (packet.channel === 'party') {
          partyNetwork.broadcastPartyChat(text);
          this.sendChatMessage(this.character.name, text, 'party', '#4ade80');
        } else {
          const ch = packet.channel || 'global';
          this.sendChatMessage(this.character.name, text, ch, ch === 'global' ? '#38bdf8' : '#f3f4f6');
        }
        break;
      }
      case 'party_join': {
        partyNetwork.joinParty(packet.partyCode, packet.member?.isLeader);
        break;
      }
      case 'party_leave': {
        partyNetwork.leaveParty();
        break;
      }
      case 'market_buy': {
        const listingIndex = this.marketListings.findIndex((l) => l.id === packet.listingId);
        if (listingIndex === -1) return;
        const listing = this.marketListings[listingIndex];
        if (this.character.gold < listing.priceGold) {
          this.sendChatMessage('Server', '⚠️ Ouro insuficiente no inventário!', 'server', '#ef4444');
          return;
        }

        this.character.gold -= listing.priceGold;
        this.character.inventory.push(listing.item);
        this.marketListings.splice(listingIndex, 1);

        const itemDef = ITEMS_DATABASE[listing.item.defId];
        this.sendChatMessage('Market', `🛒 [MERCADO DE THAIS] Comprou "${itemDef?.name || 'Item'}" por ${listing.priceGold} Gold!`, 'loot', '#f59e0b');
        this.syncCharacter();
        this.syncMarket();
        break;
      }
      case 'market_list_item': {
        const itemIdx = this.character.inventory.findIndex((i) => i.instanceId === packet.instanceId);
        if (itemIdx === -1 || packet.priceGold <= 0) return;

        const [item] = this.character.inventory.splice(itemIdx, 1);
        const newListing: MarketListing = {
          id: 'mkt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sellerName: this.character.name,
          item,
          priceGold: packet.priceGold,
          createdAt: Date.now(),
        };

        this.marketListings.unshift(newListing);
        const itemDef = ITEMS_DATABASE[item.defId];
        this.sendChatMessage('Market', `🏷️ [MERCADO DE THAIS] Anunciou "${itemDef?.name || 'Item'}" por ${packet.priceGold} Gold!`, 'server', '#38bdf8');
        this.syncCharacter();
        this.syncMarket();
        break;
      }
      case 'market_cancel_listing': {
        const listingIndex = this.marketListings.findIndex((l) => l.id === packet.listingId && l.sellerName === this.character.name);
        if (listingIndex === -1) return;
        const [listing] = this.marketListings.splice(listingIndex, 1);

        this.character.inventory.push(listing.item);
        const itemDef = ITEMS_DATABASE[listing.item.defId];
        this.sendChatMessage('Market', `↩️ [MERCADO DE THAIS] Anúncio de "${itemDef?.name || 'Item'}" cancelado. Item retornado à mochila.`, 'server', '#a855f7');
        this.syncCharacter();
        this.syncMarket();
        break;
      }
      case 'descend_floor': {
        this.descendFloor();
        break;
      }
      case 'interact_breakable': {
        this.breakObject(packet.breakableId);
        break;
      }
    }
  }

  public descendFloor() {
    if (!this.character) return;
    const room = this.rooms.get(this.currentMapId);
    if (!room || room.def.mapType !== 'dungeon') return;

    room.floorNumber = (room.floorNumber || 1) + 1;
    room.wave = 1;
    room.killsInWave = 0;
    room.targetKillsForBoss = Math.min(30, (room.def.id === 'HUNT_SEWERS' ? 8 : 10) + (room.floorNumber - 1) * 2);
    room.bossAlive = false;
    room.portalOpen = false;

    // Generate brand new procedural dungeon layout & affixes with synchronized party seed
    const newSeed = partyNetwork.partyCode
      ? calculatePartyDungeonSeed(partyNetwork.partyCode, room.def.id, room.floorNumber)
      : Math.floor(Math.random() * 10000000) + 1;
    const proc = generateProceduralDungeon(room.def.id, room.floorNumber, newSeed);
    room.grid = proc.grid;
    room.affix = proc.affix;
    room.seed = proc.seed;
    room.monsters.clear();
    room.drops.clear();
    room.hazards.clear();
    room.breakables.clear();
    for (const b of proc.breakables) {
      room.breakables.set(b.id, b);
    }

    // Teleport player to new entrance
    this.playerPos = { x: room.grid.spawnPoint.x, y: 0, z: room.grid.spawnPoint.z };
    this.currentPath = [];
    this.targetId = null;

    // Spawn packs of monsters (seeded if in party)
    if (proc.seededMonsterSpawns && proc.seededMonsterSpawns.length > 0) {
      this.spawnSeededMonsters(room, proc.seededMonsterSpawns);
    } else {
      for (let i = 0; i < 7; i++) {
        this.spawnRoomMonsters(room);
      }
    }

    if (partyNetwork.partyCode) {
      partyNetwork.broadcastPortalTrigger(room.floorNumber, room.seed);
    }

    this.sendChatMessage(
      'Dungeon',
      `🪜 Você desceu para o Andar B${room.floorNumber}! Modificador Ativo: ${room.affix.name} (${room.affix.description})`,
      'server',
      room.affix.color || '#f59e0b'
    );

    this.onPacket({
      type: 'floor_descended',
      floorNumber: room.floorNumber,
      affixName: room.affix.name,
      mapName: room.def.name,
    });
  }

  public breakObject(breakableId: string, shouldBroadcast: boolean = true) {
    if (!this.character) return;
    const room = this.rooms.get(this.currentMapId);
    if (!room || !room.breakables) return;

    const b = room.breakables.get(breakableId);
    if (!b || b.broken) return;

    b.hp = 0;
    b.broken = true;

    if (shouldBroadcast && partyNetwork.partyCode) {
      partyNetwork.broadcastBreakableHit(breakableId);
    }

    // Calculate drops with affix bonus
    const goldDrop = Math.floor((b.type === 'chest' ? 35 : 12) * (1 + (room.affix?.goldBonusPct || 0) / 100));
    this.character.gold += goldDrop;

    const isChest = b.type === 'chest';
    let dropDefId = 'potion_health';
    if (isChest) {
      const potChoices = ['potion_health', 'potion_mana', 'potion_strong_health', 'val_queen_mandible'];
      dropDefId = potChoices[Math.floor(Math.random() * potChoices.length)];
    } else if (Math.random() < 0.4) {
      dropDefId = Math.random() < 0.5 ? 'potion_health' : 'potion_mana';
    }

    const dropId = 'drop_brk_' + Math.random().toString(36).substring(2, 9);
    const itemDef = ITEMS_DATABASE[dropDefId];
    room.drops.set(dropId, {
      id: dropId,
      defId: dropDefId,
      name: itemDef?.name || dropDefId,
      rarity: itemDef?.rarity || 'common',
      x: b.x,
      y: 0.1,
      z: b.z,
      count: 1,
      createdAt: Date.now(),
    });

    this.pendingCombatEvents.push({
      id: 'brk_smash_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      sourceId: this.character.id,
      targetId: b.id,
      damage: 0,
      isCrit: isChest,
      vfxType: 'melee_slash',
      color: isChest ? '#f59e0b' : '#b45309',
      x: b.x,
      y: 0.3,
      z: b.z,
    });

    this.sendChatMessage(
      'Loot',
      `📦 Você abriu/quebrou um ${b.type === 'chest' ? 'Baú do Tesouro' : b.type === 'urn' ? 'Vaso Antigo' : 'Barril de Madeira'} e obteve +${goldDrop} Gold!`,
      'loot',
      '#facc15'
    );
  }

  public changeVocation(newVocation: VocationType) {
    if (!this.character) return;
    this.character.vocation = newVocation;
    const voc = VOCATIONS[newVocation];
    const level = this.character.level;

    // Recalculate base stats for new vocation
    this.character.maxHp = voc.baseHp + (level - 1) * voc.hpPerLevel;
    this.character.maxMana = voc.baseMana + (level - 1) * voc.manaPerLevel;
    this.character.capacity = voc.baseCap + (level - 1) * voc.capPerLevel;
    this.character.hp = this.character.maxHp;
    this.character.mana = this.character.maxMana;

    // Update spells to include default vocation spells if missing
    if (!this.character.unlockedSpells) {
      this.character.unlockedSpells = [];
    }
    for (const sp of voc.startingSpells) {
      if (!this.character.unlockedSpells.includes(sp)) {
        this.character.unlockedSpells.push(sp);
      }
    }

    localStorage.setItem('tibia_dungeons_char_voc', newVocation);
    this.saveCharacterLocally(this.character);
    this.syncCharacter();

    this.sendChatMessage(
      'Server',
      `🔄 Vocação alterada para ${voc.name}! Seu modelo 3D foi atualizado.`,
      'server',
      '#38bdf8'
    );
  }

  public resetCharacter(characterName: string, vocation: VocationType) {
    const newChar = createInitialCharacter(characterName || (this.character?.name || 'Aventurer'), vocation);
    this.character = newChar;
    this.saveCharacterLocally(newChar);
    localStorage.setItem('tibia_dungeons_char_name', newChar.name);
    localStorage.setItem('tibia_dungeons_char_voc', vocation);

    const room = this.rooms.get('HUB_THAIS')!;
    this.currentMapId = 'HUB_THAIS';
    this.playerPos = { x: room.grid.spawnPoint.x, y: 0, z: room.grid.spawnPoint.z };
    this.currentPath = [];
    this.targetId = null;
    this.isAutoHunting = false;

    this.onPacket({
      type: 'welcome',
      playerId: newChar.id,
      character: newChar,
      mapId: 'HUB_THAIS',
      offlineReport: null,
    });

    this.sendChatMessage(
      'Server',
      `✨ Personagem reiniciado com sucesso na vocação ${VOCATIONS[vocation].name}!`,
      'server',
      '#facc15'
    );
  }

  private switchMap(mapId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    if (!this.character || !MAPS_DATABASE[mapId]) return;
    const oldMapId = this.currentMapId;

    // Delete old dungeon room from memory when leaving to prevent memory bloat and guarantee unique generation
    if (oldMapId !== 'HUB_THAIS' && oldMapId !== mapId) {
      const oldRoom = this.rooms.get(oldMapId);
      if (oldRoom) {
        oldRoom.monsters.clear();
        oldRoom.drops.clear();
        oldRoom.hazards.clear();
        oldRoom.breakables.clear();
        this.rooms.delete(oldMapId);
      }
    }

    this.currentMapId = mapId;
    this.character.currentMapId = mapId;

    let room = this.rooms.get(mapId);
    if (!room || mapId !== 'HUB_THAIS') {
      const def = MAPS_DATABASE[mapId];
      if (def.isSafeZone) {
        room = this.createHubRoom();
      } else if (def.mapType === 'open_world') {
        // Static Open World Hunt Area (Mundo Aberto)
        const grid = generateMapGrid(mapId);
        room = {
          def,
          grid,
          monsters: new Map(),
          drops: new Map(),
          hazards: new Map(),
          breakables: new Map(),
          wave: 1,
          floorNumber: 1,
          seed: 1,
          affix: DUNGEON_AFFIXES[0],
          killsInWave: 0,
          targetKillsForBoss: 999999,
          bossAlive: false,
          portalOpen: false,
          difficulty,
        };

        // Pre-populate static monster spawns based on difficulty
        const initialCap = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 8 : 5;
        for (let i = 0; i < initialCap; i++) {
          this.spawnRoomMonsters(room);
        }
        this.rooms.set(mapId, room);

        const diffName = difficulty === 'easy' ? 'Fácil (1-3 Mobs)' : difficulty === 'hard' ? 'Difícil (5-8 Mobs Box)' : 'Médio (3-5 Mobs)';
        this.sendChatMessage(
          'Mundo Aberto',
          `🗺️ Você entrou em ${def.name} [Dificuldade: ${diffName}]. Respawn e regras de SQM ativos!`,
          'server',
          difficulty === 'hard' ? '#ef4444' : difficulty === 'easy' ? '#10b981' : '#f59e0b'
        );
      } else if (def.mapType === 'world_boss') {
        // World Boss Grand Arena (Arena Colossal de Incursão com Boss Pré-Invocado)
        const grid = generateMapGrid(mapId);
        room = {
          def,
          grid,
          monsters: new Map(),
          drops: new Map(),
          hazards: new Map(),
          breakables: new Map(),
          wave: 1,
          floorNumber: 1,
          seed: 1,
          affix: DUNGEON_AFFIXES[0],
          killsInWave: 0,
          targetKillsForBoss: 1,
          bossAlive: true,
          portalOpen: false,
          difficulty: 'hard',
        };

        // Spawn the legendary World Boss at bossArenaCenter
        const bossCenter = grid.bossArenaCenter || { x: 17.0, z: 14.0 };
        const bossDefId = def.bossMonsterId || 'morgaroth_lord';
        const bossDef = MONSTERS_DATABASE[bossDefId] || MONSTERS_DATABASE['morgaroth_lord'];
        const bossMonster: ActiveMonster = {
          id: `world_boss_${Date.now()}`,
          defId: bossDefId,
          def: bossDef,
          mapId,
          x: bossCenter.x,
          y: 0,
          z: bossCenter.z,
          spawnX: bossCenter.x,
          spawnZ: bossCenter.z,
          currentPath: [],
          hp: bossDef.maxHp,
          maxHp: bossDef.maxHp,
          targetPlayerId: this.character.id,
          attackCooldownUntil: 0,
          spellCooldownUntil: 0,
          telegraph: null,
          telegraphTimer: 0,
        };
        room.monsters.set(bossMonster.id, bossMonster);
        this.rooms.set(mapId, room);

        this.sendChatMessage(
          'World Boss',
          `🐉 [INCURSÃO GLOBAL] Você entrou na arena de ${def.name}! Atenção aos ataques telegrafados e áreas de perigo no chão!`,
          'server',
          '#f43f5e'
        );
      } else if (def.mapType === 'rift') {
        // Rift Tower (Torre das Fendas com alta densidade de monstros)
        const seed = Math.floor(Math.random() * 10000000) + 1;
        const proc = generateProceduralDungeon(mapId, def.riftFloor || 1, seed);
        const breakables = new Map<string, BreakableObject>();
        for (const b of proc.breakables) {
          breakables.set(b.id, b);
        }

        room = {
          def,
          grid: proc.grid,
          monsters: new Map(),
          drops: new Map(),
          hazards: new Map(),
          breakables,
          wave: 1,
          floorNumber: def.riftFloor || 1,
          seed: proc.seed,
          affix: proc.affix,
          killsInWave: 0,
          targetKillsForBoss: 12,
          bossAlive: false,
          portalOpen: false,
        };

        // Spawn dense monsters for the rift
        for (let i = 0; i < 10; i++) {
          this.spawnRoomMonsters(room);
        }
        this.rooms.set(mapId, room);

        this.sendChatMessage(
          'Rift Tower',
          `⚡ [RIFT TOWER] Fenda Maior Andar ${def.riftFloor || 1} Aberta! Derrote as hordas no limite de tempo para invocar o Guardião!`,
          'server',
          '#06b6d4'
        );
      } else {
        // Procedural Dungeon (Dungeons Procedurais com Andares, Modificadores e Ondas)
        const seed = partyNetwork.partyCode
          ? calculatePartyDungeonSeed(partyNetwork.partyCode, mapId, 1)
          : Math.floor(Math.random() * 10000000) + 1;
        const proc = generateProceduralDungeon(mapId, 1, seed);
        const breakables = new Map<string, BreakableObject>();
        for (const b of proc.breakables) {
          breakables.set(b.id, b);
        }

        room = {
          def,
          grid: proc.grid,
          monsters: new Map(),
          drops: new Map(),
          hazards: new Map(),
          breakables,
          wave: 1,
          floorNumber: 1,
          seed: proc.seed,
          affix: proc.affix,
          killsInWave: 0,
          targetKillsForBoss: 8,
          bossAlive: false,
          portalOpen: false,
        };

        if (proc.seededMonsterSpawns && proc.seededMonsterSpawns.length > 0) {
          this.spawnSeededMonsters(room, proc.seededMonsterSpawns);
        } else {
          for (let i = 0; i < 6; i++) {
            this.spawnRoomMonsters(room);
          }
        }
        this.rooms.set(mapId, room);

        this.sendChatMessage(
          'Dungeon',
          `🌀 Expedição de Masmorra: ${def.name} - Andar B1 Iniciada! Modificador: ${proc.affix.name}`,
          'server',
          proc.affix.color || '#f59e0b'
        );
      }
    }

    this.playerPos = { x: room.grid.spawnPoint.x, y: 0, z: room.grid.spawnPoint.z };
    this.currentPath = [];
    this.targetId = null;
    this.patrolWaypointIndex = 0;

    if (room.def.isSafeZone) {
      this.isAutoHunting = false;
      this.character.autoHuntActive = false;
      this.onPacket({ type: 'autohunt_sync', enabled: false });
    } else {
      // In hunting ground: if auto-hunt is active, ensure sync is emitted
      if (this.character) {
        this.character.autoHuntActive = this.isAutoHunting;
      }
      this.onPacket({ type: 'autohunt_sync', enabled: this.isAutoHunting });
    }

    this.syncCharacter();
    this.syncMarket();
  }

  public castSpell(spellId: string, aimX?: number, aimZ?: number, explicitTargetId?: string | null) {
    if (!this.character) return;
    const spell = SPELLS_DATABASE[spellId];
    if (!spell) return;

    const now = Date.now();
    if ((this.spellCooldowns[spellId] || 0) > now) return;

    const room = this.rooms.get(this.currentMapId)!;
    const activeTargetId = explicitTargetId !== undefined ? explicitTargetId : this.targetId;
    let targetMonster = activeTargetId ? room.monsters.get(activeTargetId) : undefined;
    if (targetMonster && targetMonster.hp <= 0) targetMonster = undefined;

    const spellRange = getSpellRange(spellId);

    // Compute aim direction and target ground coordinate in 360°
    let targetX = aimX !== undefined ? aimX : (targetMonster ? targetMonster.x : this.playerPos.x);
    let targetZ = aimZ !== undefined ? aimZ : (targetMonster ? targetMonster.z : this.playerPos.z);

    let aimDirX = targetX - this.playerPos.x;
    let aimDirZ = targetZ - this.playerPos.z;
    let aimDist = Math.hypot(aimDirX, aimDirZ);

    if (aimDist < 0.001) {
      aimDirX = 0;
      aimDirZ = 1;
      aimDist = 1;
    }

    const normAimX = aimDirX / aimDist;
    const normAimZ = aimDirZ / aimDist;

    // Smart Aim Selection for single-target spells if no target currently locked
    if (!spell.isHeal && spellId !== 'utevo_lux' && spellId !== 'utevo_gran_lux' && !spell.isAoe) {
      if (!targetMonster) {
        let bestScore = -999;
        let bestMonster: ActiveMonster | null = null;

        for (const m of room.monsters.values()) {
          if (m.hp <= 0) continue;
          const dist = getSqmDistance(m.x, m.z, this.playerPos.x, this.playerPos.z);
          if (dist > spellRange) continue;
          if (!hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z)) continue;

          // Dot product alignment with 360° aim vector
          const toMx = (m.x - this.playerPos.x) / dist;
          const toMz = (m.z - this.playerPos.z) / dist;
          const dot = toMx * normAimX + toMz * normAimZ;

          // Prefer enemies aligned with cursor or closest
          const score = dot * 2.0 - dist * 0.15;
          if (score > bestScore) {
            bestScore = score;
            bestMonster = m;
          }
        }

        if (bestMonster) {
          targetMonster = bestMonster;
          this.targetId = bestMonster.id;
          targetX = bestMonster.x;
          targetZ = bestMonster.z;
        }
      } else {
        // Validate locked target range and LoS
        const dist = getSqmDistance(targetMonster.x, targetMonster.z, this.playerPos.x, this.playerPos.z);
        const hasLoS = hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, targetMonster.x, targetMonster.z);
        if (dist > spellRange || !hasLoS) {
          targetMonster = undefined; // Drop locked target if out of range, allow directional skillshot
        }
      }
    }

    // Rune charge checks
    if (spell.isRune) {
      if (!this.character.runeCharges) {
        this.character.runeCharges = { rune_sd: 8, rune_gfb: 15, rune_hmm: 25, rune_uh: 12 };
      }
      const charges = this.character.runeCharges[spellId] || 0;
      if (charges <= 0) {
        this.sendChatMessage('Server', `🚫 Sem cargas da runa ${spell.name}! Derrote monstros para obter mais.`, 'server', '#ef4444');
        return;
      }
      this.character.runeCharges[spellId] = charges - 1;
    } else {
      if (this.character.mana < spell.manaCost) {
        this.sendChatMessage('Server', `🚫 Mana insuficiente para lançar ${spell.name}! (Necessário: ${spell.manaCost} MP)`, 'server', '#ef4444');
        return;
      }
      this.character.mana -= spell.manaCost;
    }

    this.spellCooldowns[spellId] = now + spell.cooldownMs;

    const result = calculateSpellCast(
      this.character,
      spell,
      targetMonster ? ({ ...targetMonster, type: 'monster', name: targetMonster.def.name, level: 5 } as any) : undefined
    );

    let vfxType: any = 'spell_aoe';
    if (spell.isHeal) {
      vfxType = 'heal_aura';
    } else if (spellId === 'rune_sd') {
      vfxType = 'magic_energy';
    } else if (spellId === 'rune_hmm') {
      vfxType = 'magic_energy';
    } else if (spell.element === 'fire' || spellId === 'rune_gfb') {
      vfxType = 'magic_fire';
    } else if (spell.element === 'ice') {
      vfxType = 'magic_ice';
    } else if (spell.element === 'holy') {
      vfxType = 'magic_holy';
    } else if (spell.element === 'energy') {
      vfxType = 'magic_energy';
    } else if (spell.element === 'earth' || spell.element === 'physical') {
      vfxType = 'spell_aoe';
    }

    if (spell.isHeal) {
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + result.damage);
      this.pendingCombatEvents.push({
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        sourceId: this.character.id,
        targetId: this.character.id,
        sourceX: this.playerPos.x,
        sourceY: 0.8,
        sourceZ: this.playerPos.z,
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
        damage: result.damage,
        isCrit: false,
        isHeal: true,
        spellWords: spell.words,
        spellId: spell.id,
        vfxType,
        color: spell.color,
      });
    } else if (spellId === 'utevo_lux' || spellId === 'utevo_gran_lux') {
      const isGran = spellId === 'utevo_gran_lux';
      this.pendingCombatEvents.push({
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        sourceId: this.character.id,
        targetId: this.character.id,
        sourceX: this.playerPos.x,
        sourceY: 0.8,
        sourceZ: this.playerPos.z,
        x: this.playerPos.x,
        y: this.playerPos.y,
        z: this.playerPos.z,
        damage: 0,
        isCrit: false,
        isHeal: false,
        spellWords: spell.words,
        spellId: spell.id,
        vfxType: isGran ? 'great_light_spell' : 'light_spell',
        color: spell.color,
      });
      this.sendChatMessage('Server', `✨ "${spell.words}" - ${spell.name} invocada! Iluminação cósmica ativa por 11m 35s.`, 'server', spell.color);
    } else if (spell.isAoe) {
      // 1. Directional Piercing Wave / Beam Spells (Exevo Vis Lux, Exevo Tera Hur)
      if (spellId === 'exevo_vis_lux' || spellId === 'exevo_tera_hur') {
        const beamRange = spell.range || 5.0;
        const beamEndGroundX = this.playerPos.x + normAimX * beamRange;
        const beamEndGroundZ = this.playerPos.z + normAimZ * beamRange;

        this.pendingCombatEvents.push({
          id: 'beam_' + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          sourceId: this.character.id,
          targetId: 'ground',
          sourceX: this.playerPos.x,
          sourceY: 0.8,
          sourceZ: this.playerPos.z,
          x: beamEndGroundX,
          y: 0.5,
          z: beamEndGroundZ,
          damage: 0,
          isCrit: false,
          isHeal: false,
          spellWords: spell.words,
          spellId: spell.id,
          vfxType,
          color: spell.color,
        });

        // Hit all enemies in the beam cone (within 35 degrees)
        for (const m of room.monsters.values()) {
          if (m.hp <= 0) continue;
          const dist = Math.hypot(m.x - this.playerPos.x, m.z - this.playerPos.z);
          if (dist > beamRange) continue;
          if (!hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z)) continue;

          const toMx = (m.x - this.playerPos.x) / dist;
          const toMz = (m.z - this.playerPos.z) / dist;
          const dot = toMx * normAimX + toMz * normAimZ;
          if (dot >= 0.70) { // ~45 degree forward arc
            m.hp = Math.max(0, m.hp - result.damage);
            this.pendingCombatEvents.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              timestamp: now,
              sourceId: this.character.id,
              targetId: m.id,
              sourceX: this.playerPos.x,
              sourceY: 0.8,
              sourceZ: this.playerPos.z,
              x: m.x,
              y: m.y,
              z: m.z,
              damage: result.damage,
              isCrit: result.isCrit,
              isBossHit: Boolean(m.def.isBoss),
              isHeal: false,
              vfxType,
              color: spell.color,
            });
            if (m.hp <= 0) this.handleMonsterDeath(room, m);
          }
        }
      } else if (spellId === 'exori' || spellId === 'exori_gran') {
        // 2. Knight Radial Whirlwind / Berserk around Player
        const aoeRadius = spell.range || 2.5;
        this.pendingCombatEvents.push({
          id: 'exori_radial_' + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          sourceId: this.character.id,
          targetId: this.character.id,
          sourceX: this.playerPos.x,
          sourceY: 0.8,
          sourceZ: this.playerPos.z,
          x: this.playerPos.x,
          y: 0.2,
          z: this.playerPos.z,
          damage: 0,
          isCrit: false,
          isHeal: false,
          spellWords: spell.words,
          spellId: spell.id,
          vfxType,
          color: spell.color,
        });

        for (const m of room.monsters.values()) {
          if (m.hp <= 0) continue;
          const dist = Math.hypot(m.x - this.playerPos.x, m.z - this.playerPos.z);
          if (dist <= aoeRadius && hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z)) {
            m.hp = Math.max(0, m.hp - result.damage);
            this.pendingCombatEvents.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              timestamp: now,
              sourceId: this.character.id,
              targetId: m.id,
              sourceX: this.playerPos.x,
              sourceY: 0.8,
              sourceZ: this.playerPos.z,
              x: m.x,
              y: m.y,
              z: m.z,
              damage: result.damage,
              isCrit: result.isCrit,
              isBossHit: Boolean(m.def.isBoss),
              isHeal: false,
              vfxType,
              color: spell.color,
            });
            if (m.hp <= 0) this.handleMonsterDeath(room, m);
          }
        }
      } else {
        // 3. Ground Targeted AoE (GFB, Exevo Mas San, Rage of the Skies)
        const aoeCenterDist = Math.min(spellRange, aimDist);
        const aoeX = aimX !== undefined ? aimX : this.playerPos.x + normAimX * aoeCenterDist;
        const aoeZ = aimZ !== undefined ? aimZ : this.playerPos.z + normAimZ * aoeCenterDist;
        const aoeRadius = spellId === 'rune_gfb' ? 3.4 : spellId === 'exevo_gran_mas_vis' ? 4.5 : 3.8;

        this.pendingCombatEvents.push({
          id: 'aoe_burst_' + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          sourceId: this.character.id,
          targetId: 'ground',
          sourceX: this.playerPos.x,
          sourceY: 0.8,
          sourceZ: this.playerPos.z,
          x: aoeX,
          y: 0.1,
          z: aoeZ,
          damage: 0,
          isCrit: false,
          isHeal: false,
          spellWords: spell.words,
          spellId: spell.id,
          vfxType,
          color: spell.color,
        });

        for (const m of room.monsters.values()) {
          if (m.hp <= 0) continue;
          const dist = Math.hypot(m.x - aoeX, m.z - aoeZ);
          if (dist <= aoeRadius && hasLineOfSight(room.grid, this.playerPos.x, this.playerPos.z, m.x, m.z)) {
            m.hp = Math.max(0, m.hp - result.damage);
            this.pendingCombatEvents.push({
              id: 'c_' + Math.random().toString(36).substring(2, 9),
              timestamp: now,
              sourceId: this.character.id,
              targetId: m.id,
              sourceX: this.playerPos.x,
              sourceY: 0.8,
              sourceZ: this.playerPos.z,
              x: m.x,
              y: m.y,
              z: m.z,
              damage: result.damage,
              isCrit: result.isCrit,
              isBossHit: Boolean(m.def.isBoss),
              isHeal: false,
              vfxType,
              color: spell.color,
            });
            if (m.hp <= 0) this.handleMonsterDeath(room, m);
          }
        }

        if (spellId === 'rune_gfb') {
          const hazId = 'haz_fire_' + Math.random().toString(36).substring(2, 9);
          room.hazards.set(hazId, {
            id: hazId,
            type: 'fire',
            x: aoeX,
            y: 0.05,
            z: aoeZ,
            radius: 2.5,
            durationMs: 6000,
            createdAt: now,
            damagePerTick: 18,
            lastTickAt: now,
          });
        }
      }
    } else if (targetMonster) {
      // 4. Single-Target Spell Hit on Monster
      targetMonster.hp = Math.max(0, targetMonster.hp - result.damage);
      this.pendingCombatEvents.push({
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        sourceId: this.character.id,
        targetId: targetMonster.id,
        sourceX: this.playerPos.x,
        sourceY: 0.8,
        sourceZ: this.playerPos.z,
        x: targetMonster.x,
        y: targetMonster.y,
        z: targetMonster.z,
        damage: result.damage,
        isCrit: result.isCrit,
        isBossHit: Boolean(targetMonster.def.isBoss),
        isHeal: false,
        spellWords: spell.words,
        spellId: spell.id,
        vfxType,
        color: spell.color,
      });

      if (targetMonster.hp <= 0) {
        this.handleMonsterDeath(room, targetMonster);
      }
    } else {
      // 5. Skillshot Ground Impact / Miss
      const projectileDist = Math.min(spellRange, Math.max(2.0, aimDist));
      const groundImpactX = this.playerPos.x + normAimX * projectileDist;
      const groundImpactZ = this.playerPos.z + normAimZ * projectileDist;

      this.pendingCombatEvents.push({
        id: 'c_skillshot_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        sourceId: this.character.id,
        targetId: 'ground',
        sourceX: this.playerPos.x,
        sourceY: 0.8,
        sourceZ: this.playerPos.z,
        x: groundImpactX,
        y: 0.2,
        z: groundImpactZ,
        damage: 0,
        isCrit: false,
        isHeal: false,
        spellWords: spell.words,
        spellId: spell.id,
        vfxType,
        color: spell.color,
      });
    }

    this.character.skills.magic += 0.06;
    this.syncCharacter();
  }

  public usePotion(potionTypeOrDefId: string) {
    if (!this.character) return;
    let targetDefId = potionTypeOrDefId;
    if (potionTypeOrDefId === 'health') {
      const hasStrong = this.character.inventory.find(i => i.defId === 'potion_strong_health');
      targetDefId = hasStrong ? 'potion_strong_health' : 'potion_health';
    } else if (potionTypeOrDefId === 'mana') {
      targetDefId = 'potion_mana';
    }

    const index = this.character.inventory.findIndex((i) => i.defId === targetDefId);
    if (index === -1) {
      this.sendChatMessage('Server', 'Você não possui esta poção em sua bag!', 'server', '#ef4444');
      return;
    }

    const item = this.character.inventory[index];
    const def = ITEMS_DATABASE[item.defId];
    if (!def || def.type !== 'potion') return;

    if (def.healthRestore) {
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + def.healthRestore);
      this.sendChatMessage('Server', `⚡ Usou ${def.name} (+${def.healthRestore} HP)`, 'server', '#10b981');
    }
    if (def.manaRestore) {
      this.character.mana = Math.min(this.character.maxMana, this.character.mana + def.manaRestore);
      this.sendChatMessage('Server', `⚡ Usou ${def.name} (+${def.manaRestore} MP)`, 'server', '#38bdf8');
    }

    if (item.count > 1) {
      item.count -= 1;
    } else {
      this.character.inventory.splice(index, 1);
    }

    this.syncCharacter();
  }

  private equipItem(instanceId: string, slot: EquipmentSlot) {
    if (!this.character) return;
    const idx = this.character.inventory.findIndex((i) => i.instanceId === instanceId);
    if (idx === -1) return;

    const item = this.character.inventory[idx];
    const def = ITEMS_DATABASE[item.defId];
    if (!def) return;

    if (def.reqLevel && this.character.level < def.reqLevel) {
      this.sendChatMessage('Server', `⚠️ Você precisa ser Nível ${def.reqLevel} para equipar ${def.name}!`, 'server', '#ef4444');
      return;
    }

    this.character.inventory.splice(idx, 1);
    const prevEquipped = this.character.equipment[slot];
    if (prevEquipped) {
      this.character.inventory.push(prevEquipped);
    }
    this.character.equipment[slot] = item;
    this.sendChatMessage('Server', `🛡️ Equipou ${def.name} com sucesso.`, 'server', '#10b981');
    this.syncCharacter();
  }

  private unequipItem(slot: EquipmentSlot) {
    if (!this.character) return;
    const item = this.character.equipment[slot];
    if (!item) return;
    this.character.equipment[slot] = null;
    this.character.inventory.push(item);
    this.syncCharacter();
  }

  private dropOrSellItem(instanceId: string) {
    if (!this.character) return;
    const idx = this.character.inventory.findIndex((i) => i.instanceId === instanceId);
    if (idx === -1) return;

    const item = this.character.inventory[idx];
    const def = ITEMS_DATABASE[item.defId];
    const sellValue = (def?.price || 10) * item.count;
    this.character.inventory.splice(idx, 1);
    this.character.gold += sellValue;
    this.sendChatMessage('Server', `Vendeu ${item.count}x ${def?.name || 'Item'} por ${sellValue} Gold.`, 'loot', '#eab308');
    this.syncCharacter();
  }

  private buyItem(itemDefId: string, count: number) {
    if (!this.character) return;
    const def = ITEMS_DATABASE[itemDefId];
    if (!def) return;
    const totalCost = (def.price || 10) * count;
    if (this.character.gold < totalCost) {
      this.sendChatMessage('Comerciante', `Você não possui Gold suficiente para comprar ${count}x ${def.name}! (Necessário: ${totalCost} Gold)`, 'server', '#ef4444');
      return;
    }

    this.character.gold -= totalCost;
    if (def.stackable) {
      const existing = this.character.inventory.find(i => i.defId === itemDefId);
      if (existing) {
        existing.count += count;
      } else {
        this.character.inventory.push({
          instanceId: 'item_' + Math.random().toString(36).substring(2, 9),
          defId: itemDefId,
          count,
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        this.character.inventory.push({
          instanceId: 'item_' + Math.random().toString(36).substring(2, 9),
          defId: itemDefId,
          count: 1,
        });
      }
    }

    this.sendChatMessage('Comerciante', `Comprou ${count}x ${def.name} por ${totalCost} Gold!`, 'loot', '#22c55e');
    this.syncCharacter();
  }

  private stashDeposit(instanceId: string) {
    if (!this.character) return;
    if (!this.character.stash) this.character.stash = [];
    const idx = this.character.inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return;

    const [item] = this.character.inventory.splice(idx, 1);
    this.character.stash.push(item);
    const def = ITEMS_DATABASE[item.defId];
    this.sendChatMessage('Depot', `Guardou ${item.count}x ${def?.name || 'Item'} no seu Baú de Thais.`, 'server', '#38bdf8');
    this.syncCharacter();
  }

  private stashWithdraw(instanceId: string) {
    if (!this.character || !this.character.stash) return;
    const idx = this.character.stash.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return;

    const [item] = this.character.stash.splice(idx, 1);
    this.character.inventory.push(item);
    const def = ITEMS_DATABASE[item.defId];
    this.sendChatMessage('Depot', `Retirou ${item.count}x ${def?.name || 'Item'} do seu Baú de Thais.`, 'server', '#38bdf8');
    this.syncCharacter();
  }

  private bountyClaim(bountyId: string) {
    if (!this.character || !this.character.bounties) return;
    const bounty = this.character.bounties.find(b => b.id === bountyId);
    if (!bounty) return;
    if (!bounty.completed) {
      this.sendChatMessage('Capitão Harlan', `Esta missão ainda não foi concluída! [${bounty.currentKills}/${bounty.requiredKills}] ${bounty.targetMonsterName}.`, 'server', '#ef4444');
      return;
    }
    if (bounty.claimed) {
      this.sendChatMessage('Capitão Harlan', `Você já resgatou esta recompensa hoje!`, 'server', '#eab308');
      return;
    }

    bounty.claimed = true;
    this.character.gold += bounty.rewardGold;
    this.character.experience += bounty.rewardExp;
    this.sendChatMessage('Capitão Harlan', `🎖️ Excelente trabalho, aventureiro! Recompensa concedida: +${bounty.rewardGold} Gold e +${bounty.rewardExp} EXP por "${bounty.title}"!`, 'server', '#22c55e');

    const newLevel = getLevelFromExperience(this.character.experience);
    if (newLevel > this.character.level) {
      const voc = VOCATIONS[this.character.vocation];
      const diff = newLevel - this.character.level;
      this.character.level = newLevel;
      this.character.maxHp += voc.hpPerLevel * diff;
      this.character.maxMana += voc.manaPerLevel * diff;
      this.character.capacity += voc.capPerLevel * diff;
      this.character.hp = this.character.maxHp;
      this.character.mana = this.character.maxMana;
      this.character.experienceToNext = getExperienceForLevel(this.character.level + 1);

      this.onPacket({
        type: 'level_up',
        level: newLevel,
        hpGain: voc.hpPerLevel * diff,
        manaGain: voc.manaPerLevel * diff,
      });
      this.sendChatMessage('Server', `🎉 Parabéns! Você avançou para o Level ${newLevel}!`, 'server', '#fbbf24');
    }

    this.syncCharacter();
  }

  private syncCharacter() {
    if (!this.character) return;
    this.onPacket({
      type: 'character_sync',
      character: { ...this.character },
    });
  }

  public sendChatMessage(sender: string, text: string, channel: 'say' | 'server' | 'loot' | 'party' | 'global' = 'global', color?: string) {
    this.onPacket({
      type: 'chat',
      sender,
      text,
      channel,
      color,
    });
  }
}
