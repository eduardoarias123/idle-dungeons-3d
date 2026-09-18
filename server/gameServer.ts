import { WebSocket } from 'ws';
import { 
  CharacterData, 
  ClientPacket, 
  CombatEvent, 
  DropItemEntity, 
  EntityState, 
  EquipmentSlot, 
  MapHuntDef, 
  MonsterDef, 
  ServerPacket, 
  VocationType 
} from '../src/types/game';
import { MAPS_DATABASE } from '../src/constants/maps';
import { MONSTERS_DATABASE } from '../src/constants/monsters';
import { ITEMS_DATABASE } from '../src/constants/items';
import { SPELLS_DATABASE } from '../src/constants/spells';
import { 
  createInitialCharacter, 
  getExperienceForLevel, 
  getLevelFromExperience, 
  VOCATIONS 
} from '../src/constants/vocations';
import { generateMapGrid, isWalkable, MapGrid } from '../src/game-shared/mapLayout';
import { findPath, hasLineOfSight, findKiteStep } from '../src/game-shared/pathfinding';
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
} from '../src/game-shared/distance';
import { db } from './persistence';
import { logServerError, logServerEvent } from './errorLogger';
import { calculateMonsterAttack, calculatePlayerAttack, calculateSpellCast } from '../src/game-shared/combat';
import { calculateOfflineProgress } from '../src/game-shared/offline';

interface ActivePlayer {
  id: string;
  ws: WebSocket;
  character: CharacterData;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  targetX?: number;
  targetZ?: number;
  currentPath: Array<{ x: number; z: number }>;
  targetId: string | null;
  isAutoHunting: boolean;
  patrolWaypointIndex: number;
  attackCooldownUntil: number;
  spellCooldowns: Record<string, number>;
  lastRegenTick: number;
}

interface ActiveMonster {
  id: string;
  defId: string;
  def: MonsterDef;
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  currentPath: Array<{ x: number; z: number }>;
  hp: number;
  maxHp: number;
  targetPlayerId: string | null;
  attackCooldownUntil: number;
  spellCooldownUntil: number;
  telegraph: { radius: number; x: number; z: number; progress: number } | null;
  telegraphTimer: number;
}

interface MapRoomState {
  def: MapHuntDef;
  grid: MapGrid;
  monsters: Map<string, ActiveMonster>;
  drops: Map<string, DropItemEntity>;
  wave: number;
  killsInWave: number;
  targetKillsForBoss: number;
  bossAlive: boolean;
}

export class GameServer {
  private players = new Map<string, ActivePlayer>();
  private rooms = new Map<string, MapRoomState>();
  private tickInterval: NodeJS.Timeout | null = null;
  private pendingCombatEvents: Map<string, CombatEvent[]> = new Map();
  private parties = new Map<string, Set<WebSocket>>();

  constructor() {
    this.initRooms();
    this.startLoop();
  }

  private initRooms() {
    for (const [mapId, def] of Object.entries(MAPS_DATABASE)) {
      const grid = generateMapGrid(mapId);
      this.rooms.set(mapId, {
        def,
        grid,
        monsters: new Map(),
        drops: new Map(),
        wave: 1,
        killsInWave: 0,
        targetKillsForBoss: mapId === 'HUNT_SEWERS' ? 8 : 10,
        bossAlive: false,
      });
      this.pendingCombatEvents.set(mapId, []);

      if (!def.isSafeZone) {
        const roomState = this.rooms.get(mapId)!;
        for (let i = 0; i < 6; i++) {
          this.spawnRoomMonsters(roomState);
        }
      }
    }
  }

  public handleConnection(ws: WebSocket) {
    let playerId = '';

    ws.on('message', (message: string) => {
      try {
        const packet: ClientPacket = JSON.parse(message.toString());
        this.processPacket(ws, playerId, packet, (assignedId) => {
          playerId = assignedId;
        });
      } catch (err) {
        logServerError('GameServer.ws.message', err, {
          playerId: playerId || '(sem id)',
          rawLength: typeof message === 'string' ? message.length : undefined,
        });
      }
    });

    ws.on('error', (err) => {
      logServerError('GameServer.ws.error', err, { playerId: playerId || '(sem id)' });
    });

    ws.on('close', (code, reason) => {
      logServerEvent('GameServer.ws.close', `Conexão WebSocket fechada (code=${code}).`, {
        playerId: playerId || '(sem id)',
        reason: reason?.toString?.() || '',
      });
      // Clean up party memberships
      for (const [code, partySet] of this.parties.entries()) {
        partySet.delete(ws);
        if (partySet.size === 0) {
          this.parties.delete(code);
        }
      }

      if (playerId && this.players.has(playerId)) {
        const p = this.players.get(playerId)!;
        db.saveCharacter(p.character);
        this.players.delete(playerId);
        console.log(`[Server] Player ${p.character.name} (${playerId}) disconnected.`);
      }
    });
  }

  private broadcastToParty(partyCode: string, senderWs: WebSocket, packet: any) {
    const sockets = this.parties.get(partyCode);
    if (!sockets) return;
    const msg = JSON.stringify(packet);
    for (const s of sockets) {
      if (s !== senderWs && s.readyState === WebSocket.OPEN) {
        try {
          s.send(msg);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  private processPacket(
    ws: WebSocket,
    currentId: string,
    packet: ClientPacket,
    setId: (id: string) => void
  ) {
    switch (packet.type) {
      case 'join': {
        logServerEvent('GameServer.join', `Pedido de login recebido: "${packet.characterName}" (${packet.vocation}).`);
        let char = db.getCharacterByName(packet.characterName);
        let offlineReport = null;

        if (!char) {
          logServerEvent('GameServer.join', `Personagem "${packet.characterName}" não existia no banco; criando novo.`);
          char = createInitialCharacter(packet.characterName, packet.vocation);
          db.saveCharacter(char);
        } else {
          // Process offline progression if returning
          offlineReport = calculateOfflineProgress(char);
          if (offlineReport && (offlineReport.monstersKilled > 0 || offlineReport.expGained > 0)) {
            db.saveCharacter(char);
          }
        }

        const playerId = char.id;
        setId(playerId);

        const currentMapId = char.currentMapId || 'HUB_THAIS';
        const room = this.rooms.get(currentMapId) || this.rooms.get('HUB_THAIS')!;
        const spawn = room.grid.spawnPoint;

        logServerEvent('GameServer.join', `Jogador ativo criado: "${char.name}" Lv.${char.level} no mapa ${currentMapId}.`, {
          playerId,
          spawn,
          hp: char.hp,
          maxHp: char.maxHp,
        });

        const activePlayer: ActivePlayer = {
          id: playerId,
          ws,
          character: char,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          currentPath: [],
          targetId: null,
          isAutoHunting: false,
          patrolWaypointIndex: 0,
          attackCooldownUntil: 0,
          spellCooldowns: {},
          lastRegenTick: Date.now(),
        };

        this.players.set(playerId, activePlayer);

        // Send Welcome Packet
        const welcomePacket: ServerPacket = {
          type: 'welcome',
          playerId,
          character: char,
          mapId: currentMapId,
          offlineReport,
        };
        this.send(ws, welcomePacket);

        // Broadcast join message to room
        this.broadcastChat(
          currentMapId,
          'Server',
          `${char.name} the ${VOCATIONS[char.vocation].name} entered ${room.def.name}.`,
          'server',
          '#60a5fa'
        );
        break;
      }

      case 'move': {
        const player = this.players.get(currentId);
        if (!player) return;
        const room = this.rooms.get(player.character.currentMapId);
        if (!room) return;

        // Find path to target
        const path = findPath(room.grid, player.x, player.z, packet.x, packet.z);
        if (path.length > 0) {
          player.currentPath = path;
          player.targetX = packet.x;
          player.targetZ = packet.z;
        }
        break;
      }

      case 'move_direction': {
        const player = this.players.get(currentId);
        if (!player) return;
        const room = this.rooms.get(player.character.currentMapId);
        if (!room) return;

        player.rotation = Math.atan2(packet.dx, packet.dz);
        const curX = snapToSqm(player.x);
        const curZ = snapToSqm(player.z);
        const targetX = curX + packet.dx;
        const targetZ = curZ + packet.dz;
        if (isWalkable(room.grid, targetX, targetZ)) {
          player.currentPath = [{ x: targetX, z: targetZ }];
          player.targetX = targetX;
          player.targetZ = targetZ;
        }
        break;
      }

      case 'select_target': {
        const player = this.players.get(currentId);
        if (player) {
          player.targetId = packet.targetId;
        }
        break;
      }

      case 'toggle_autohunt': {
        const player = this.players.get(currentId);
        if (player) {
          player.isAutoHunting = packet.enabled;
          if (packet.enabled) {
            player.patrolWaypointIndex = 0;
            player.currentPath = [];
          }
          this.sendChat(
            player.ws,
            'Auto-Hunt',
            packet.enabled ? 'Cavebot Active: Exploring dungeon chambers and hunting monsters!' : 'Auto-Hunt disabled.',
            'server',
            packet.enabled ? '#22c55e' : '#eab308'
          );
        }
        break;
      }

      case 'switch_map': {
        const player = this.players.get(currentId);
        if (!player) return;
        const targetMap = MAPS_DATABASE[packet.mapId];
        if (!targetMap) return;

        // If hunt requires level
        if (player.character.level < targetMap.recommendedLevel) {
          this.sendChat(
            player.ws,
            'Gatekeeper',
            `You must be at least Level ${targetMap.recommendedLevel} to enter ${targetMap.name}!`,
            'server',
            '#ef4444'
          );
          return;
        }

        player.character.currentMapId = packet.mapId;
        const newRoom = this.rooms.get(packet.mapId)!;
        player.x = newRoom.grid.spawnPoint.x;
        player.z = newRoom.grid.spawnPoint.z;
        player.currentPath = [];
        player.targetId = null;
        player.patrolWaypointIndex = 0;

        if (!newRoom.def.isSafeZone) {
          player.isAutoHunting = true;
          this.send(player.ws, { type: 'autohunt_sync', enabled: true });
        } else {
          player.isAutoHunting = false;
          this.send(player.ws, { type: 'autohunt_sync', enabled: false });
        }

        db.saveCharacter(player.character);

        this.send(player.ws, {
          type: 'character_sync',
          character: player.character,
        });

        this.sendChat(
          player.ws,
          'Server',
          `You entered ${newRoom.def.name}.`,
          'server',
          '#38bdf8'
        );
        break;
      }

      case 'cast_spell': {
        const player = this.players.get(currentId);
        if (player) {
          this.castPlayerSpell(player, packet.spellId);
        }
        break;
      }

      case 'use_potion': {
        const player = this.players.get(currentId);
        if (!player) return;
        this.usePotion(player, packet.potionType);
        break;
      }

      case 'equip_item': {
        const player = this.players.get(currentId);
        if (player) {
          this.equipItem(player, packet.instanceId, packet.slot);
        }
        break;
      }

      case 'unequip_item': {
        const player = this.players.get(currentId);
        if (player) {
          this.unequipItem(player, packet.slot);
        }
        break;
      }

      case 'drop_or_sell_item': {
        const player = this.players.get(currentId);
        if (player) {
          this.sellOrDropItem(player, packet.instanceId);
        }
        break;
      }

      case 'rest_at_shrine': {
        const player = this.players.get(currentId);
        if (!player) return;
        const room = this.rooms.get(player.character.currentMapId);
        if (room?.def.isSafeZone) {
          player.character.hp = player.character.maxHp;
          player.character.mana = player.character.maxMana;
          this.send(player.ws, { type: 'character_sync', character: player.character });
          this.addCombatEvent(player.character.currentMapId, {
            id: 'shrine_' + Math.random(),
            timestamp: Date.now(),
            sourceId: player.id,
            targetId: player.id,
            damage: player.character.maxHp,
            isHeal: true,
            spellWords: 'Sanctuary Blessing',
            color: '#34d399',
            x: player.x,
            y: 0,
            z: player.z,
          });
        }
        break;
      }

      case 'chat': {
        const player = this.players.get(currentId);
        if (!player || !packet.text?.trim()) return;
        const text = packet.text.trim().substring(0, 150);
        const channel = packet.channel || 'global';
        this.broadcastChat(
          player.character.currentMapId,
          player.character.name,
          text,
          channel,
          channel === 'global' ? '#38bdf8' : channel === 'server' ? '#fbbf24' : '#f3f4f6'
        );
        break;
      }

      case 'party_join': {
        const pCode = packet.partyCode.trim().toUpperCase();
        if (!this.parties.has(pCode)) {
          this.parties.set(pCode, new Set());
        }
        this.parties.get(pCode)!.add(ws);
        this.broadcastToParty(pCode, ws, {
          type: 'party_relay',
          payload: {
            type: 'MEMBER_JOIN',
            partyCode: pCode,
            senderId: packet.member.id,
            senderName: packet.member.name,
            timestamp: Date.now(),
            payload: packet.member,
          },
        });
        break;
      }

      case 'party_leave': {
        const pCode = packet.partyCode.trim().toUpperCase();
        const partySet = this.parties.get(pCode);
        if (partySet) {
          partySet.delete(ws);
          this.broadcastToParty(pCode, ws, {
            type: 'party_relay',
            payload: {
              type: 'MEMBER_LEAVE',
              partyCode: pCode,
              senderId: packet.memberId,
              senderName: '',
              timestamp: Date.now(),
              payload: { memberId: packet.memberId },
            },
          });
        }
        break;
      }

      case 'party_relay': {
        const pCode = packet.partyCode.trim().toUpperCase();
        if (!this.parties.has(pCode)) {
          this.parties.set(pCode, new Set());
        }
        this.parties.get(pCode)!.add(ws);
        this.broadcastToParty(pCode, ws, {
          type: 'party_relay',
          payload: packet.payload,
        });
        break;
      }
    }
  }

  private equipItem(player: ActivePlayer, instanceId: string, slot: EquipmentSlot) {
    const invIdx = player.character.inventory.findIndex(i => i.instanceId === instanceId);
    if (invIdx === -1) return;
    const invItem = player.character.inventory[invIdx];
    const def = ITEMS_DATABASE[invItem.defId];
    if (!def) return;

    if (def.reqLevel && player.character.level < def.reqLevel) {
      this.sendChat(player.ws, 'Server', `Requires Level ${def.reqLevel} to equip!`, 'server', '#ef4444');
      return;
    }
    if (def.reqVocation && !def.reqVocation.includes(player.character.vocation)) {
      this.sendChat(player.ws, 'Server', 'Your vocation cannot equip this item!', 'server', '#ef4444');
      return;
    }

    // Unequip currently equipped item if exists
    const currentEquipped = player.character.equipment[slot];
    player.character.equipment[slot] = invItem;
    player.character.inventory.splice(invIdx, 1);

    if (currentEquipped) {
      player.character.inventory.push(currentEquipped);
    }

    db.saveCharacter(player.character);
    this.send(player.ws, { type: 'character_sync', character: player.character });
  }

  private unequipItem(player: ActivePlayer, slot: EquipmentSlot) {
    const equipped = player.character.equipment[slot];
    if (!equipped) return;
    if (player.character.inventory.length >= 24) {
      this.sendChat(player.ws, 'Server', 'Your backpack is full!', 'server', '#ef4444');
      return;
    }

    player.character.equipment[slot] = null;
    player.character.inventory.push(equipped);
    db.saveCharacter(player.character);
    this.send(player.ws, { type: 'character_sync', character: player.character });
  }

  private sellOrDropItem(player: ActivePlayer, instanceId: string) {
    const idx = player.character.inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return;
    const item = player.character.inventory[idx];
    const def = ITEMS_DATABASE[item.defId];
    if (!def) return;

    const sellPrice = Math.max(1, Math.floor(def.price * 0.4 * (item.count || 1)));
    player.character.gold += sellPrice;
    player.character.inventory.splice(idx, 1);

    db.saveCharacter(player.character);
    this.send(player.ws, { type: 'character_sync', character: player.character });
    this.sendChat(player.ws, 'Merchant', `Sold ${def.name} for ${sellPrice} Gold!`, 'loot', '#eab308');
  }

  private usePotion(player: ActivePlayer, potionType: 'health' | 'mana') {
    const potDefId = potionType === 'health' ? 'potion_health' : 'potion_mana';
    const idx = player.character.inventory.findIndex(i => i.defId === potDefId);
    if (idx === -1) {
      this.sendChat(player.ws, 'Server', `You have no ${potionType} potions!`, 'server', '#ef4444');
      return;
    }

    const item = player.character.inventory[idx];
    const def = ITEMS_DATABASE[item.defId];
    if (!def) return;

    item.count--;
    if (item.count <= 0) {
      player.character.inventory.splice(idx, 1);
    }

    if (potionType === 'health') {
      const heal = def.healthRestore || 120;
      player.character.hp = Math.min(player.character.maxHp, player.character.hp + heal);
      this.addCombatEvent(player.character.currentMapId, {
        id: 'pot_' + Math.random(),
        timestamp: Date.now(),
        sourceId: player.id,
        targetId: player.id,
        damage: heal,
        isHeal: true,
        spellWords: 'Aaaah...',
        color: '#ef4444',
        x: player.x,
        y: 0,
        z: player.z,
      });
    } else {
      const manaRec = def.manaRestore || 100;
      player.character.mana = Math.min(player.character.maxMana, player.character.mana + manaRec);
      this.addCombatEvent(player.character.currentMapId, {
        id: 'pot_' + Math.random(),
        timestamp: Date.now(),
        sourceId: player.id,
        targetId: player.id,
        damage: manaRec,
        isMana: true,
        spellWords: 'Chuuug...',
        color: '#38bdf8',
        x: player.x,
        y: 0,
        z: player.z,
      });
    }

    this.send(player.ws, { type: 'character_sync', character: player.character });
  }

  private castPlayerSpell(player: ActivePlayer, spellId: string) {
    const spell = SPELLS_DATABASE[spellId];
    if (!spell) return;

    const now = Date.now();
    const cd = player.spellCooldowns[spellId] || 0;
    if (now < cd) return;

    if (player.character.mana < spell.manaCost) {
      this.sendChat(player.ws, 'Server', 'Not enough mana!', 'server', '#ef4444');
      return;
    }

    player.character.mana -= spell.manaCost;
    player.spellCooldowns[spellId] = now + spell.cooldownMs;

    // Advance Magic Level tries
    player.character.skills.manaSpent += spell.manaCost;
    const manaNeeded = Math.floor(160 * Math.pow(1.1, player.character.skills.magic));
    if (player.character.skills.manaSpent >= manaNeeded) {
      player.character.skills.magic++;
      player.character.skills.manaSpent = 0;
      this.send(player.ws, {
        type: 'skill_up',
        skill: 'magic',
        newLevel: player.character.skills.magic,
      });
      this.sendChat(player.ws, 'Level Up', `Your Magic Level advanced to ${player.character.skills.magic}!`, 'server', '#818cf8');
    }

    const room = this.rooms.get(player.character.currentMapId);
    if (!room) return;

    // Execute Spell Effect
    if (spell.isHeal) {
      const combatRes = calculateSpellCast(player.character, spell);
      player.character.hp = Math.min(player.character.maxHp, player.character.hp + combatRes.damage);
      this.addCombatEvent(room.def.id, {
        id: 'spell_' + Math.random(),
        timestamp: now,
        sourceId: player.id,
        targetId: player.id,
        damage: combatRes.damage,
        isHeal: true,
        spellWords: spell.words,
        color: spell.color,
        x: player.x,
        y: 0,
        z: player.z,
      });
      this.send(player.ws, { type: 'character_sync', character: player.character });
      return;
    }

    // Offensive Spell
    if (spell.isAoe) {
      // Hit all monsters within spell SQM range that have clear line of sight
      let hits = 0;
      for (const monster of room.monsters.values()) {
        const dist = getSqmDistance(monster.x, monster.z, player.x, player.z);
        if (dist <= spell.range && hasLineOfSight(room.grid, player.x, player.z, monster.x, monster.z)) {
          const res = calculateSpellCast(player.character, spell, {
            id: monster.id,
            type: 'monster',
            name: monster.def.name,
            x: monster.x,
            y: 0,
            z: monster.z,
            rotation: 0,
            hp: monster.hp,
            maxHp: monster.maxHp,
            level: 1,
          });
          monster.hp -= res.damage;
          this.addCombatEvent(room.def.id, {
            id: 'aoe_' + Math.random(),
            timestamp: now,
            sourceId: player.id,
            targetId: monster.id,
            damage: res.damage,
            isCrit: res.isCrit,
            spellWords: hits === 0 ? spell.words : undefined,
            color: spell.color,
            x: monster.x,
            y: 0,
            z: monster.z,
          });
          hits++;
          if (monster.hp <= 0) {
            this.handleMonsterDeath(room, monster, player);
          }
        }
      }
    } else {
      // Single Target offensive spell
      const targetMonster = player.targetId ? room.monsters.get(player.targetId) : this.findNearestMonster(room, player.x, player.z);
      if (targetMonster) {
        const dist = getSqmDistance(targetMonster.x, targetMonster.z, player.x, player.z);
        if (dist <= spell.range && hasLineOfSight(room.grid, player.x, player.z, targetMonster.x, targetMonster.z)) {
          const res = calculateSpellCast(player.character, spell, {
            id: targetMonster.id,
            type: 'monster',
            name: targetMonster.def.name,
            x: targetMonster.x,
            y: 0,
            z: targetMonster.z,
            rotation: 0,
            hp: targetMonster.hp,
            maxHp: targetMonster.maxHp,
            level: 1,
          });
          targetMonster.hp -= res.damage;
          this.addCombatEvent(room.def.id, {
            id: 'spell_' + Math.random(),
            timestamp: now,
            sourceId: player.id,
            targetId: targetMonster.id,
            damage: res.damage,
            isCrit: res.isCrit,
            spellWords: spell.words,
            color: spell.color,
            x: targetMonster.x,
            y: 0,
            z: targetMonster.z,
          });
          if (targetMonster.hp <= 0) {
            this.handleMonsterDeath(room, targetMonster, player);
          }
        }
      }
    }

    this.send(player.ws, { type: 'character_sync', character: player.character });
  }

  private startLoop() {
    const TICK_RATE_MS = 100; // 10 ticks per second

    this.tickInterval = setInterval(() => {
      // try/catch: um erro no tick não pode derrubar o processo do servidor
      try {
        this.tick();
      } catch (err) {
        logServerError('GameServer.tick', err, {
          players: this.players.size,
          rooms: this.rooms.size,
        });
      }
    }, TICK_RATE_MS);
  }

  private tick() {
    const now = Date.now();

    // 1. Process Rooms & Monster AI
    for (const room of this.rooms.values()) {
      if (!room.def.isSafeZone) {
        this.spawnRoomMonsters(room);
        this.updateRoomMonsters(room, now);
      }
    }

    // 2. Process Players (Movement, Auto-Hunt, Attacks, Passive Regen)
    for (const player of this.players.values()) {
      this.updatePlayerMovement(player);
      this.updatePlayerAutoHunt(player, now);
      this.updatePlayerPassiveRegen(player, now);
    }

    // 3. Broadcast Ticks to Connected Clients
    for (const [mapId, room] of this.rooms.entries()) {
      const roomPlayers = Array.from(this.players.values()).filter(
        p => p.character.currentMapId === mapId
      );

      if (roomPlayers.length === 0) continue;

      const entities: EntityState[] = [];

      // Pack players
      for (const p of roomPlayers) {
        entities.push({
          id: p.id,
          type: 'player',
          name: p.character.name,
          vocation: p.character.vocation,
          x: p.x,
          y: 0,
          z: p.z,
          targetX: p.currentPath[0]?.x,
          targetZ: p.currentPath[0]?.z,
          rotation: p.rotation ?? 0,
          hp: p.character.hp,
          maxHp: p.character.maxHp,
          mana: p.character.mana,
          maxMana: p.character.maxMana,
          level: p.character.level,
          targetId: p.targetId,
          isMoving: p.currentPath.length > 0,
          isAttacking: p.targetId !== null,
        });
      }

      // Pack monsters
      for (const m of room.monsters.values()) {
        entities.push({
          id: m.id,
          type: 'monster',
          name: m.def.name,
          modelType: m.def.modelType,
          x: m.x,
          y: 0,
          z: m.z,
          targetX: m.currentPath[0]?.x,
          targetZ: m.currentPath[0]?.z,
          rotation: m.rotation ?? 0,
          hp: m.hp,
          maxHp: m.maxHp,
          level: 1,
          isBoss: m.def.isBoss,
          targetId: m.targetPlayerId,
          isMoving: m.currentPath.length > 0,
          telegraph: m.telegraph,
        });
      }

      const drops = Array.from(room.drops.values());
      const combatEvents = this.pendingCombatEvents.get(mapId) || [];

      const packet: ServerPacket = {
        type: 'tick',
        timestamp: now,
        mapId,
        entities,
        drops,
        combatEvents: [...combatEvents],
        waveInfo: !room.def.isSafeZone
          ? {
              currentWave: room.wave,
              waveKills: room.killsInWave,
              waveTarget: room.targetKillsForBoss,
              bossAlive: room.bossAlive,
            }
          : undefined,
      };

      for (const p of roomPlayers) {
        this.send(p.ws, packet);
      }

      // Clear processed combat events
      this.pendingCombatEvents.set(mapId, []);
    }
  }

  private updatePlayerMovement(player: ActivePlayer) {
    if (player.currentPath.length > 0) {
      const stepMs = getStepDurationMs(
        player.character.level,
        Boolean(player.character.equipment?.boots?.defId === 'boots_haste')
      );
      const tilesPerSec = 1000 / stepMs;
      let remainingSpeed = tilesPerSec * 0.1; // 100ms server tick

      while (remainingSpeed > 0 && player.currentPath.length > 0) {
        const targetPoint = player.currentPath[0];
        const dx = targetPoint.x - player.x;
        const dz = targetPoint.z - player.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.005) {
          player.rotation = Math.atan2(dx, dz);
        }

        if (dist <= remainingSpeed || dist < 0.01) {
          player.x = targetPoint.x;
          player.z = targetPoint.z;
          remainingSpeed -= Math.max(0.01, dist);
          player.currentPath.shift();
        } else {
          player.x += (dx / dist) * remainingSpeed;
          player.z += (dz / dist) * remainingSpeed;
          remainingSpeed = 0;
        }
      }
    } else {
      player.x = snapToSqm(player.x);
      player.z = snapToSqm(player.z);
    }
  }

  private updatePlayerAutoHunt(player: ActivePlayer, now: number) {
    const room = this.rooms.get(player.character.currentMapId);
    if (!room || room.def.isSafeZone) return;

    // 1. Pick up nearby drops automatically (within 2 SQMs)
    for (const drop of room.drops.values()) {
      const dist = getSqmDistance(drop.x, drop.z, player.x, player.z);
      if (dist <= 2) {
        this.pickupDrop(room, player, drop.id);
        break;
      }
    }

    if (!player.isAutoHunting) {
      // If manual mode, still auto-attack selected target if in range and off cooldown
      if (player.targetId && now >= player.attackCooldownUntil) {
        const target = room.monsters.get(player.targetId);
        if (target) {
          this.tryPlayerAttack(player, target, room, now);
        }
      }
      return;
    }

    // 2. Auto-Heal priority: if HP < 60%
    if (player.character.hp < player.character.maxHp * 0.6) {
      const healSpell = player.character.unlockedSpells.find(s => {
        const def = SPELLS_DATABASE[s];
        return def?.isHeal && player.character.mana >= def.manaCost;
      });
      if (healSpell && (player.spellCooldowns[healSpell] || 0) <= now) {
        this.castPlayerSpell(player, healSpell);
      } else if (player.character.hp < player.character.maxHp * 0.4) {
        // Emergency health potion
        this.usePotion(player, 'health');
      }
    }

    // 3. Check for nearby loot in room (within 5 SQMs)
    let nearbyDrop: DropItemEntity | null = null;
    for (const drop of room.drops.values()) {
      const d = getSqmDistance(drop.x, drop.z, player.x, player.z);
      if (d <= 5) {
        nearbyDrop = drop;
        break;
      }
    }

    // 4. Combat / Monster Target Selection
    let target = player.targetId ? room.monsters.get(player.targetId) : null;
    if (target && (target.hp <= 0 || getSqmDistance(target.x, target.z, player.x, player.z) > 12)) {
      target = null;
      player.targetId = null;
    }

    // If no current target, check perception range (within 7 SQMs)
    if (!target) {
      target = this.findNearestMonsterInRange(room, player.x, player.z, 7);
      player.targetId = target ? target.id : null;
    }

    // If a monster is found within engagement range:
    if (target) {
      const attackRange = getVocationAttackRange(player.character.vocation);
      const distToTarget = getSqmDistance(target.x, target.z, player.x, player.z);
      const hasLoS = hasLineOfSight(room.grid, player.x, player.z, target.x, target.z);
      const isRanged = attackRange > 1;

      if (distToTarget > attackRange || !hasLoS) {
        // Run towards target
        if (
          player.currentPath.length === 0 ||
          getSqmDistance(
            player.currentPath[player.currentPath.length - 1].x,
            player.currentPath[player.currentPath.length - 1].z,
            target.x,
            target.z
          ) > 1
        ) {
          player.currentPath = findPath(room.grid, player.x, player.z, target.x, target.z, 350);
        }
      } else {
        // Within SQM attack range with clear line of sight
        // If playing ranged vocation and target closes into melee distance (dist <= 2), kite away!
        if (isRanged && distToTarget <= 2 && player.currentPath.length === 0) {
          const obstacles = Array.from(room.monsters.values()).map((m) => ({ x: m.x, z: m.z }));
          const kiteStep = findKiteStep(room.grid, player.x, player.z, target.x, target.z, {
            dangerDistance: 2,
            desiredDistance: 3,
            maxDistance: attackRange,
            otherObstacles: obstacles,
          });
          if (kiteStep) {
            player.currentPath = [kiteStep];
          }
        } else if (distToTarget > 2 || !isRanged) {
          player.currentPath = [];
          player.x = snapToSqm(player.x);
          player.z = snapToSqm(player.z);
        }

        // Auto offensive spell cast
        const offensiveSpell = player.character.unlockedSpells.find(s => {
          const def = SPELLS_DATABASE[s];
          return !def?.isHeal && player.character.mana >= def.manaCost && (player.spellCooldowns[s] || 0) <= now;
        });
        if (offensiveSpell) {
          this.castPlayerSpell(player, offensiveSpell);
        }

        // Normal basic attack
        if (now >= player.attackCooldownUntil) {
          this.tryPlayerAttack(player, target, room, now);
        }
      }
      return;
    }

    // 5. If there is loot nearby, walk over to pick it up
    if (nearbyDrop) {
      const d = getSqmDistance(nearbyDrop.x, nearbyDrop.z, player.x, player.z);
      if (d > 1 && player.currentPath.length === 0) {
        player.currentPath = findPath(room.grid, player.x, player.z, nearbyDrop.x, nearbyDrop.z, 60);
        return;
      }
    }

    // 6. DUNGEON EXPLORATION / RUNNING THE CAVE:
    const chambers = room.grid.rooms.length > 1 ? room.grid.rooms.slice(1) : room.grid.rooms;
    const waypoints = chambers.map(r => ({
      x: r.x + Math.floor(r.w / 2) + 0.5,
      z: r.z + Math.floor(r.h / 2) + 0.5,
    }));

    if (waypoints.length === 0) return;

    const currentWp = waypoints[player.patrolWaypointIndex % waypoints.length];
    const distToWp = getSqmDistance(currentWp.x, currentWp.z, player.x, player.z);

    if (distToWp <= 1) {
      // Reached chamber! Advance to next chamber in the dungeon
      player.patrolWaypointIndex = (player.patrolWaypointIndex + 1) % waypoints.length;
      const nextWp = waypoints[player.patrolWaypointIndex % waypoints.length];
      player.currentPath = findPath(room.grid, player.x, player.z, nextWp.x, nextWp.z, 350);
    } else if (player.currentPath.length === 0) {
      // Sprint along the path to the current chamber
      player.currentPath = findPath(room.grid, player.x, player.z, currentWp.x, currentWp.z, 350);
    }
  }

  private tryPlayerAttack(player: ActivePlayer, target: ActiveMonster, room: MapRoomState, now: number) {
    const range = getVocationAttackRange(player.character.vocation);
    const dist = getSqmDistance(target.x, target.z, player.x, player.z);
    if (dist > range || !hasLineOfSight(room.grid, player.x, player.z, target.x, target.z)) return;

    player.attackCooldownUntil = now + 950; // Responsive attack speed ~0.95s

    const res = calculatePlayerAttack(player.character, target.def);
    target.hp -= res.damage;

    // Train Weapon skill
    const skillType = player.character.vocation === 'KNIGHT' ? 'sword' : (player.character.vocation === 'PALADIN' ? 'distance' : 'magic');
    if (skillType === 'sword') {
      player.character.skills.swordTries++;
      if (player.character.skills.swordTries >= 35) {
        player.character.skills.sword++;
        player.character.skills.swordTries = 0;
        this.send(player.ws, { type: 'skill_up', skill: 'sword', newLevel: player.character.skills.sword });
      }
    } else if (skillType === 'distance') {
      player.character.skills.distanceTries++;
      if (player.character.skills.distanceTries >= 30) {
        player.character.skills.distance++;
        player.character.skills.distanceTries = 0;
        this.send(player.ws, { type: 'skill_up', skill: 'distance', newLevel: player.character.skills.distance });
      }
    }

    this.addCombatEvent(room.def.id, {
      id: 'atk_' + Math.random(),
      timestamp: now,
      sourceId: player.id,
      targetId: target.id,
      damage: res.damage,
      isCrit: res.isCrit,
      color: res.color,
      x: target.x,
      y: 0,
      z: target.z,
    });

    if (target.hp <= 0) {
      this.handleMonsterDeath(room, target, player);
    }
  }

  private updatePlayerPassiveRegen(player: ActivePlayer, now: number) {
    if (now - player.lastRegenTick >= 2000) {
      player.lastRegenTick = now;
      const voc = VOCATIONS[player.character.vocation];
      const hasLifeRing = player.character.equipment.ring?.defId === 'ring_life';
      const hpBonus = hasLifeRing ? 4 : 0;
      const manaBonus = hasLifeRing ? 6 : 0;

      if (player.character.hp < player.character.maxHp) {
        player.character.hp = Math.min(player.character.maxHp, player.character.hp + voc.hpRegenPerTick + hpBonus);
      }
      if (player.character.mana < player.character.maxMana) {
        player.character.mana = Math.min(player.character.maxMana, player.character.mana + voc.manaRegenPerTick + manaBonus);
      }
    }
  }

  private spawnRoomMonsters(room: MapRoomState) {
    if (room.monsters.size >= room.def.maxMonsters && !room.bossAlive) return;

    // Boss Spawn condition
    if (room.killsInWave >= room.targetKillsForBoss && !room.bossAlive && room.def.bossMonsterId) {
      const bossDef = MONSTERS_DATABASE[room.def.bossMonsterId];
      if (bossDef && room.grid.bossArenaCenter) {
        const bossId = 'boss_' + Math.random().toString(36).substring(2, 9);
        room.monsters.set(bossId, {
          id: bossId,
          defId: bossDef.id,
          def: bossDef,
          mapId: room.def.id,
          x: room.grid.bossArenaCenter.x,
          y: 0,
          z: room.grid.bossArenaCenter.z,
          currentPath: [],
          hp: bossDef.maxHp,
          maxHp: bossDef.maxHp,
          targetPlayerId: null,
          attackCooldownUntil: 0,
          spellCooldownUntil: 0,
          telegraph: null,
          telegraphTimer: 0,
        });
        room.bossAlive = true;

        this.broadcastChat(
          room.def.id,
          'Dungeon Altar',
          `⚠️ WARNING: ${bossDef.name} has awakened in the Boss Chamber!`,
          'server',
          '#ef4444'
        );
      }
      return;
    }

    if (room.monsters.size < room.def.maxMonsters) {
      // Pick random room (skip room 0 to protect the entrance stairs)
      const spawnableRooms = room.grid.rooms.length > 1 ? room.grid.rooms.slice(1) : room.grid.rooms;
      const randomRoom = spawnableRooms[Math.floor(Math.random() * spawnableRooms.length)];
      const spawnX = randomRoom.x + 1 + Math.random() * (randomRoom.w - 2);
      const spawnZ = randomRoom.z + 1 + Math.random() * (randomRoom.h - 2);

      if (!isWalkable(room.grid, spawnX, spawnZ)) return;

      // Pick monster from pool
      const pool = room.def.monsterSpawnPool;
      if (!pool || pool.length === 0) return;

      let chosen = pool[0].monsterId;
      const rand = Math.random() * 100;
      let acc = 0;
      for (const p of pool) {
        acc += p.weight;
        if (rand <= acc) {
          chosen = p.monsterId;
          break;
        }
      }

      const def = MONSTERS_DATABASE[chosen];
      if (!def) return;

      const monsterId = 'mob_' + Math.random().toString(36).substring(2, 9);
      room.monsters.set(monsterId, {
        id: monsterId,
        defId: def.id,
        def,
        mapId: room.def.id,
        x: spawnX,
        y: 0,
        z: spawnZ,
        currentPath: [],
        hp: def.maxHp,
        maxHp: def.maxHp,
        targetPlayerId: null,
        attackCooldownUntil: 0,
        spellCooldownUntil: 0,
        telegraph: null,
        telegraphTimer: 0,
      });
    }
  }

  private updateRoomMonsters(room: MapRoomState, now: number) {
    const roomPlayers = Array.from(this.players.values()).filter(
      p => p.character.currentMapId === room.def.id
    );
    if (roomPlayers.length === 0) return;

    for (const monster of room.monsters.values()) {
      // Check aggro target
      let targetPlayer = monster.targetPlayerId ? this.players.get(monster.targetPlayerId) : null;
      if (!targetPlayer || targetPlayer.character.currentMapId !== room.def.id) {
        // Find nearest player within aggro radius (4 SQMs, protected at entrance)
        let closestDist = 5;
        targetPlayer = null;
        for (const p of roomPlayers) {
          // Entrance Safe Zone: monsters will not aggro players resting at the entrance stairs
          const distToEntrance = getSqmDistance(p.x, p.z, room.grid.spawnPoint.x, room.grid.spawnPoint.z);
          if (distToEntrance < 4 && !monster.def.isBoss) {
            continue;
          }
          const d = getSqmDistance(p.x, p.z, monster.x, monster.z);
          if (d < closestDist) {
            closestDist = d;
            targetPlayer = p;
          }
        }
        monster.targetPlayerId = targetPlayer ? targetPlayer.id : null;
      }

      // Handle Boss Telegraph Attacks
      if (monster.def.isBoss && monster.telegraph) {
        monster.telegraph.progress += 0.08;
        if (monster.telegraph.progress >= 1.0) {
          // Execute AOE Slam
          for (const p of roomPlayers) {
            const dist = getSqmDistance(p.x, p.z, monster.telegraph.x, monster.telegraph.z);
            if (dist <= monster.telegraph.radius) {
              const slamDamage = Math.floor(monster.def.attack * 1.5);
              p.character.hp = Math.max(0, p.character.hp - slamDamage);
              this.addCombatEvent(room.def.id, {
                id: 'slam_' + Math.random(),
                timestamp: now,
                sourceId: monster.id,
                targetId: p.id,
                damage: slamDamage,
                isCrit: true,
                color: '#ea580c',
                x: p.x,
                y: 0,
                z: p.z,
              });
              if (p.character.hp <= 0) {
                this.handlePlayerDeath(p);
              }
            }
          }
          monster.telegraph = null;
        }
        continue;
      }

      if (!targetPlayer) {
        // Roam randomly
        if (monster.currentPath.length === 0 && Math.random() < 0.02) {
          const rx = Math.floor(monster.x + (Math.random() * 6 - 3)) + 0.5;
          const rz = Math.floor(monster.z + (Math.random() * 6 - 3)) + 0.5;
          if (isWalkable(room.grid, Math.floor(rx), Math.floor(rz))) {
            monster.currentPath = findPath(room.grid, monster.x, monster.z, rx, rz, 20);
          }
        }
      } else {
        const dist = getSqmDistance(targetPlayer.x, targetPlayer.z, monster.x, monster.z);
        if (dist > 8 && !monster.def.isBoss) {
          // Player ran away to another room, drop aggro
          monster.targetPlayerId = null;
          monster.currentPath = [];
          continue;
        }

        const attackRange = getMonsterAttackRange(monster.def);

        // Boss chance to initiate telegraph special attack
        if (monster.def.isBoss && Math.random() < 0.04 && !monster.telegraph && now >= monster.spellCooldownUntil) {
          monster.spellCooldownUntil = now + 6000;
          monster.telegraph = {
            radius: 3,
            x: targetPlayer.x,
            z: targetPlayer.z,
            progress: 0,
          };
          this.addCombatEvent(room.def.id, {
            id: 'shout_' + Math.random(),
            timestamp: now,
            sourceId: monster.id,
            targetId: monster.id,
            damage: 0,
            spellWords: `${monster.def.name} prepares a devastating slam!`,
            color: '#f97316',
            x: monster.x,
            y: 0,
            z: monster.z,
          });
          continue;
        }

        const hasLoS = hasLineOfSight(room.grid, monster.x, monster.z, targetPlayer.x, targetPlayer.z);
        const isRangedMonster = monster.def.isRanged || (monster.def.spells && monster.def.spells.length > 0 && attackRange > 1);

        if (dist > attackRange || !hasLoS) {
          // Chase player
          if (monster.currentPath.length === 0 || Math.random() < 0.15) {
            monster.currentPath = findPath(room.grid, monster.x, monster.z, targetPlayer.x, targetPlayer.z, 30);
          }
        } else if (isRangedMonster && dist <= 2) {
          // Tactical kiting for ranged monsters
          if (monster.currentPath.length === 0) {
            const otherMonsters = Array.from(room.monsters.values())
              .filter((m) => m.id !== monster.id)
              .map((m) => ({ x: m.x, z: m.z }));
            const kiteStep = findKiteStep(room.grid, monster.x, monster.z, targetPlayer.x, targetPlayer.z, {
              dangerDistance: 2,
              desiredDistance: 3,
              maxDistance: attackRange,
              otherObstacles: otherMonsters,
            });
            if (kiteStep) {
              monster.currentPath = [kiteStep];
            }
          }
        } else {
          // Attack player
          monster.currentPath = [];
          monster.x = snapToSqm(monster.x);
          monster.z = snapToSqm(monster.z);
          if (now >= monster.attackCooldownUntil && hasLoS) {
            monster.attackCooldownUntil = now + 1500;
            const res = calculateMonsterAttack(monster.def, targetPlayer.character);
            targetPlayer.character.hp = Math.max(0, targetPlayer.character.hp - res.damage);

            // Train player shielding
            targetPlayer.character.skills.shieldingTries++;
            if (targetPlayer.character.skills.shieldingTries >= 30) {
              targetPlayer.character.skills.shielding++;
              targetPlayer.character.skills.shieldingTries = 0;
              this.send(targetPlayer.ws, {
                type: 'skill_up',
                skill: 'shielding',
                newLevel: targetPlayer.character.skills.shielding,
              });
            }

            this.addCombatEvent(room.def.id, {
              id: 'mon_atk_' + Math.random(),
              timestamp: now,
              sourceId: monster.id,
              targetId: targetPlayer.id,
              damage: res.damage,
              color: res.color,
              x: targetPlayer.x,
              y: 0,
              z: targetPlayer.z,
            });

            if (targetPlayer.character.hp <= 0) {
              this.handlePlayerDeath(targetPlayer);
            }
          }
        }
      }

      // Move along path in SQM steps
      if (monster.currentPath.length > 0) {
        const stepMs = getMonsterStepDurationMs(monster.def.speed);
        const tilesPerSec = 1000 / stepMs;
        let remainingSpeed = tilesPerSec * 0.1; // 100ms server tick

        while (remainingSpeed > 0 && monster.currentPath.length > 0) {
          const next = monster.currentPath[0];
          const dx = next.x - monster.x;
          const dz = next.z - monster.z;
          const d = Math.hypot(dx, dz);

          if (d > 0.005) {
            monster.rotation = Math.atan2(dx, dz);
          }

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

  private handlePlayerDeath(player: ActivePlayer) {
    this.sendChat(
      player.ws,
      'Death',
      'You were slain! You have been rescued and returned to the Temple of Thais.',
      'server',
      '#ef4444'
    );

    player.character.currentMapId = 'HUB_THAIS';
    const hub = this.rooms.get('HUB_THAIS')!;
    player.x = hub.grid.spawnPoint.x;
    player.z = hub.grid.spawnPoint.z;
    player.character.hp = player.character.maxHp;
    player.character.mana = player.character.maxMana;
    player.targetId = null;
    player.isAutoHunting = false;
    player.currentPath = [];

    db.saveCharacter(player.character);
    this.send(player.ws, { type: 'character_sync', character: player.character });
    this.send(player.ws, { type: 'autohunt_sync', enabled: false });
  }

  private handleMonsterDeath(room: MapRoomState, monster: ActiveMonster, killer: ActivePlayer) {
    room.monsters.delete(monster.id);

    // Wave Progression
    room.killsInWave++;
    killer.character.killsCount++;

    if (monster.def.isBoss) {
      room.bossAlive = false;
      room.killsInWave = 0;
      room.wave++;
      killer.character.bossKills++;
      this.broadcastChat(
        room.def.id,
        'Victory',
        `🏆 ${killer.character.name} has conquered ${monster.def.name}! Wave ${room.wave} begins!`,
        'server',
        '#f59e0b'
      );
    }

    // Award Exp to Killer
    const expGain = monster.def.exp;
    killer.character.experience += expGain;
    const nextLvlExp = getExperienceForLevel(killer.character.level + 1);

    if (killer.character.experience >= nextLvlExp) {
      const newLvl = getLevelFromExperience(killer.character.experience);
      const lvlsGained = newLvl - killer.character.level;
      if (lvlsGained > 0) {
        const voc = VOCATIONS[killer.character.vocation];
        const hpGained = voc.hpPerLevel * lvlsGained;
        const manaGained = voc.manaPerLevel * lvlsGained;

        killer.character.level = newLvl;
        killer.character.maxHp += hpGained;
        killer.character.maxMana += manaGained;
        killer.character.capacity += voc.capPerLevel * lvlsGained;
        killer.character.hp = killer.character.maxHp;
        killer.character.mana = killer.character.maxMana;
        killer.character.experienceToNext = getExperienceForLevel(newLvl + 1);

        this.send(killer.ws, {
          type: 'level_up',
          level: newLvl,
          hpGain: hpGained,
          manaGain: manaGained,
        });

        this.broadcastChat(
          room.def.id,
          'Level Up',
          `🎉 ${killer.character.name} advanced from Level ${killer.character.level - lvlsGained} to Level ${newLvl}!`,
          'server',
          '#fbbf24'
        );
      }
    }

    // Gold Drop
    const goldDrop = Math.floor(monster.def.goldMin + Math.random() * (monster.def.goldMax - monster.def.goldMin + 1));
    killer.character.gold += goldDrop;

    // Item Drops
    for (const loot of monster.def.lootTable) {
      if (Math.random() <= loot.chance) {
        const count = Math.floor((loot.minCount || 1) + Math.random() * ((loot.maxCount || 1) - (loot.minCount || 1) + 1));
        const itemDef = ITEMS_DATABASE[loot.defId];
        if (itemDef) {
          const dropId = 'drop_' + Math.random().toString(36).substring(2, 9);
          room.drops.set(dropId, {
            id: dropId,
            defId: itemDef.id,
            name: itemDef.name,
            count,
            rarity: itemDef.rarity,
            x: monster.x,
            y: 0,
            z: monster.z,
            createdAt: Date.now(),
          });
          break; // Max 1-2 items per drop entity
        }
      }
    }

    db.saveCharacter(killer.character);
    this.send(killer.ws, { type: 'character_sync', character: killer.character });
  }

  private pickupDrop(room: MapRoomState, player: ActivePlayer, dropId: string) {
    const drop = room.drops.get(dropId);
    if (!drop) return;

    if (player.character.inventory.length >= 24) {
      this.sendChat(player.ws, 'Server', 'Your backpack is completely full!', 'server', '#ef4444');
      return;
    }

    room.drops.delete(dropId);

    const def = ITEMS_DATABASE[drop.defId];
    if (def && def.stackable) {
      const existing = player.character.inventory.find(i => i.defId === drop.defId);
      if (existing) {
        existing.count += drop.count;
      } else {
        player.character.inventory.push({
          instanceId: 'item_' + Math.random().toString(36).substring(2, 9),
          defId: drop.defId,
          count: drop.count,
        });
      }
    } else {
      player.character.inventory.push({
        instanceId: 'item_' + Math.random().toString(36).substring(2, 9),
        defId: drop.defId,
        count: drop.count,
      });
    }

    db.saveCharacter(player.character);
    this.send(player.ws, { type: 'character_sync', character: player.character });
    this.send(player.ws, {
      type: 'loot_received',
      itemDefId: drop.defId,
      count: drop.count,
      gold: 0,
      rarity: drop.rarity,
    });
  }

  private findNearestMonster(room: MapRoomState, x: number, z: number): ActiveMonster | null {
    let closest: ActiveMonster | null = null;
    let minDist = Infinity;
    for (const m of room.monsters.values()) {
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < minDist) {
        minDist = d;
        closest = m;
      }
    }
    return closest;
  }

  private findNearestMonsterInRange(room: MapRoomState, x: number, z: number, maxRange: number): ActiveMonster | null {
    let closest: ActiveMonster | null = null;
    let minDist = maxRange;
    for (const m of room.monsters.values()) {
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < minDist) {
        minDist = d;
        closest = m;
      }
    }
    return closest;
  }

  private addCombatEvent(mapId: string, event: CombatEvent) {
    const list = this.pendingCombatEvents.get(mapId);
    if (list) {
      list.push(event);
    }
  }

  private broadcastChat(
    mapId: string,
    sender: string,
    text: string,
    channel: 'say' | 'server' | 'loot' | 'party' | 'global' = 'global',
    color?: string
  ) {
    const packet: ServerPacket = {
      type: 'chat',
      sender,
      text,
      channel,
      color,
    };
    for (const p of this.players.values()) {
      if (channel === 'global' || channel === 'server' || p.character.currentMapId === mapId) {
        this.send(p.ws, packet);
      }
    }
  }

  private sendChat(
    ws: WebSocket,
    sender: string,
    text: string,
    channel: 'say' | 'server' | 'loot' | 'party' | 'global' = 'global',
    color?: string
  ) {
    this.send(ws, {
      type: 'chat',
      sender,
      text,
      channel,
      color,
    });
  }

  private send(ws: WebSocket, packet: ServerPacket) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(packet));
    }
  }
}
