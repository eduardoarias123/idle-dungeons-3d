import { CombatEvent, LootMode, PartyMemberInfo, PartyState, VocationType } from '../../types/game';

export interface PartyRelayMessage {
  type:
    | 'PLAYER_STATE'
    | 'COMBAT_EVENT'
    | 'MONSTER_DEFEAT'
    | 'BREAKABLE_HIT'
    | 'PORTAL_TRIGGER'
    | 'PARTY_CHAT'
    | 'MEMBER_JOIN'
    | 'MEMBER_LEAVE'
    | 'PARTY_CONFIG'
    | 'LEADER_CHANGE'
    | 'PARTY_HEARTBEAT';
  partyCode: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  payload: any;
}

export class PartyNetworkManager {
  public partyCode: string | null = null;
  public isLeader: boolean = false;
  public members: Map<string, PartyMemberInfo> = new Map();
  public lootMode: LootMode = 'shared';
  public experienceSharing: boolean = true;

  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private currentCharacter: { id: string; name: string; vocation: VocationType; level: number } | null = null;

  // Listeners
  public onPartyUpdate?: (members: PartyMemberInfo[], partyCode: string | null) => void;
  public onRemotePlayerUpdate?: (player: PartyMemberInfo) => void;
  public onPartyCombatEvent?: (evt: CombatEvent, monsterId?: string, damage?: number) => void;
  public onPartyMonsterDefeat?: (monsterId: string, exp: number, gold: number, killerName: string) => void;
  public onPartyBreakableHit?: (breakableId: string) => void;
  public onPartyPortalTrigger?: (floorNumber: number, leaderName: string, seed?: number) => void;
  public onPartyChatMessage?: (sender: string, text: string) => void;

  constructor() {
    // Check saved party from local storage
    const savedCode = localStorage.getItem('tibia_party_code');
    if (savedCode) {
      this.partyCode = savedCode.trim().toUpperCase();
      this.isLeader = localStorage.getItem('tibia_party_is_leader') === 'true';
    }
    const savedLootMode = localStorage.getItem('tibia_party_loot_mode') as LootMode | null;
    if (savedLootMode === 'shared' || savedLootMode === 'free_for_all' || savedLootMode === 'leader_priority') {
      this.lootMode = savedLootMode;
    }
    if (localStorage.getItem('tibia_party_exp_sharing') === 'false') {
      this.experienceSharing = false;
    }
  }

  public init(character: { id: string; name: string; vocation: VocationType; level: number }) {
    this.currentCharacter = character;
    if (this.partyCode) {
      this.setupChannels(this.partyCode);
    }
  }

  public joinParty(code: string, isLeader: boolean = false) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    this.partyCode = cleanCode;
    this.isLeader = isLeader;
    localStorage.setItem('tibia_party_code', cleanCode);
    localStorage.setItem('tibia_party_is_leader', isLeader ? 'true' : 'false');

    this.setupChannels(cleanCode);

    if (this.currentCharacter) {
      const myInfo: PartyMemberInfo = {
        id: this.currentCharacter.id,
        name: this.currentCharacter.name,
        vocation: this.currentCharacter.vocation,
        level: this.currentCharacter.level,
        hp: 100,
        maxHp: 100,
        currentMapId: 'HUB_THAIS',
        floorNumber: 1,
        isLeader: this.isLeader,
        isOnline: true,
        lastSeen: Date.now(),
      };
      this.members.set(myInfo.id, myInfo);
      this.broadcast({
        type: 'MEMBER_JOIN',
        partyCode: cleanCode,
        senderId: myInfo.id,
        senderName: myInfo.name,
        timestamp: Date.now(),
        payload: myInfo,
      });
      this.notifyPartyUpdate();
    }
  }

  public leaveParty() {
    if (this.partyCode && this.currentCharacter) {
      this.broadcast({
        type: 'MEMBER_LEAVE',
        partyCode: this.partyCode,
        senderId: this.currentCharacter.id,
        senderName: this.currentCharacter.name,
        timestamp: Date.now(),
        payload: { memberId: this.currentCharacter.id },
      });
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'party_leave',
          partyCode: this.partyCode,
          memberId: this.currentCharacter?.id || '',
        })
      );
    }

    this.partyCode = null;
    this.isLeader = false;
    this.members.clear();
    localStorage.removeItem('tibia_party_code');
    localStorage.removeItem('tibia_party_is_leader');

    this.notifyPartyUpdate();
  }

  private setupChannels(code: string) {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }

    // 1. BroadcastChannel for instant local / multi-tab synchronization
    try {
      this.broadcastChannel = new BroadcastChannel(`tibia_dungeon_party_${code}`);
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    } catch (e) {
      console.warn('[Party] BroadcastChannel not supported or restricted:', e);
    }

    // 2. WebSocket for cross-machine / remote synchronization
    this.connectWebSocket(code);

    // 3. Heartbeat & stale member cleanup every 3 seconds
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
      this.cleanStaleMembers();
    }, 3000);
  }

  private connectWebSocket(code: string) {
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.ws = new WebSocket(`${protocol}//${host}`);

      this.ws.onopen = () => {
        if (this.currentCharacter && this.partyCode) {
          const myInfo: PartyMemberInfo = {
            id: this.currentCharacter.id,
            name: this.currentCharacter.name,
            vocation: this.currentCharacter.vocation,
            level: this.currentCharacter.level,
            hp: 100,
            maxHp: 100,
            currentMapId: 'HUB_THAIS',
            floorNumber: 1,
            isLeader: this.isLeader,
            isOnline: true,
            lastSeen: Date.now(),
          };
          this.ws?.send(
            JSON.stringify({
              type: 'party_join',
              partyCode: this.partyCode,
              member: myInfo,
            })
          );
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'party_relay' && data.payload) {
            this.handleIncomingMessage(data.payload);
          }
        } catch (err) {
          // ignore non-party server packets
        }
      };

      this.ws.onerror = () => {
        // gracefully fallback to BroadcastChannel
      };

      this.ws.onclose = () => {
        // will retry on next party action if needed
      };
    } catch (err) {
      console.warn('[Party] WebSocket connection deferred:', err);
    }
  }

  private broadcast(msg: PartyRelayMessage) {
    if (!this.partyCode) return;

    // A. BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        // channel error
      }
    }

    // B. WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'party_relay',
            partyCode: this.partyCode,
            payload: msg,
          })
        );
      } catch (e) {
        // ws error
      }
    }
  }

  private handleIncomingMessage(msg: PartyRelayMessage) {
    if (!msg || msg.partyCode !== this.partyCode) return;
    if (this.currentCharacter && msg.senderId === this.currentCharacter.id) return; // Don't process self

    switch (msg.type) {
      case 'PLAYER_STATE': {
        const player = msg.payload as PartyMemberInfo;
        if (player && player.id) {
          player.lastSeen = Date.now();
          player.isOnline = true;
          this.members.set(player.id, player);
          this.onRemotePlayerUpdate?.(player);
          this.notifyPartyUpdate();
        }
        break;
      }

      case 'MEMBER_JOIN': {
        const player = msg.payload as PartyMemberInfo;
        if (player && player.id) {
          player.lastSeen = Date.now();
          player.isOnline = true;
          this.members.set(player.id, player);
          this.notifyPartyUpdate();

          // Reply with our own state so new member discovers us immediately
          if (this.currentCharacter) {
            this.sendHeartbeat();
          }
        }
        break;
      }

      case 'MEMBER_LEAVE': {
        const { memberId } = msg.payload || {};
        if (memberId && this.members.has(memberId)) {
          this.members.delete(memberId);
          this.checkAndPromoteLeader();
          this.notifyPartyUpdate();
        }
        break;
      }

      case 'COMBAT_EVENT': {
        const { evt, monsterId, damage } = msg.payload || {};
        if (evt) {
          this.onPartyCombatEvent?.(evt, monsterId, damage);
        }
        break;
      }

      case 'MONSTER_DEFEAT': {
        const { monsterId, exp, gold, killerName } = msg.payload || {};
        if (monsterId) {
          this.onPartyMonsterDefeat?.(monsterId, exp, gold, killerName || msg.senderName);
        }
        break;
      }

      case 'BREAKABLE_HIT': {
        const { breakableId } = msg.payload || {};
        if (breakableId) {
          this.onPartyBreakableHit?.(breakableId);
        }
        break;
      }

      case 'PORTAL_TRIGGER': {
        const { floorNumber, leaderName, seed } = msg.payload || {};
        if (floorNumber) {
          this.onPartyPortalTrigger?.(floorNumber, leaderName || msg.senderName, seed);
        }
        break;
      }

      case 'PARTY_CHAT': {
        const { text } = msg.payload || {};
        if (text) {
          this.onPartyChatMessage?.(msg.senderName, text);
        }
        break;
      }

      case 'PARTY_CONFIG': {
        const { lootMode, experienceSharing } = msg.payload || {};
        if (lootMode) this.lootMode = lootMode;
        if (experienceSharing !== undefined) this.experienceSharing = experienceSharing;
        this.notifyPartyUpdate();
        break;
      }

      case 'LEADER_CHANGE': {
        const { newLeaderId } = msg.payload || {};
        if (newLeaderId) {
          for (const [id, m] of this.members.entries()) {
            m.isLeader = (id === newLeaderId);
          }
          this.isLeader = (this.currentCharacter?.id === newLeaderId);
          localStorage.setItem('tibia_party_is_leader', this.isLeader ? 'true' : 'false');
          this.notifyPartyUpdate();
        }
        break;
      }

      case 'PARTY_HEARTBEAT': {
        const player = msg.payload as PartyMemberInfo;
        if (player && player.id) {
          player.lastSeen = Date.now();
          player.isOnline = true;
          this.members.set(player.id, player);
          this.notifyPartyUpdate();
        }
        break;
      }
    }
  }

  public broadcastPlayerState(info: Partial<PartyMemberInfo>) {
    if (!this.partyCode || !this.currentCharacter) return;

    const fullInfo: PartyMemberInfo = {
      id: this.currentCharacter.id,
      name: this.currentCharacter.name,
      vocation: this.currentCharacter.vocation,
      level: this.currentCharacter.level,
      hp: info.hp ?? 100,
      maxHp: info.maxHp ?? 100,
      currentMapId: info.currentMapId || 'HUB_THAIS',
      floorNumber: info.floorNumber || 1,
      x: info.x,
      z: info.z,
      rotation: info.rotation,
      isMoving: info.isMoving,
      isAttacking: info.isAttacking,
      isLeader: this.isLeader,
      isOnline: true,
      lastSeen: Date.now(),
    };

    this.members.set(fullInfo.id, fullInfo);

    this.broadcast({
      type: 'PLAYER_STATE',
      partyCode: this.partyCode,
      senderId: fullInfo.id,
      senderName: fullInfo.name,
      timestamp: Date.now(),
      payload: fullInfo,
    });
  }

  public broadcastCombatHit(
    evt: CombatEvent,
    monsterId?: string,
    damage?: number
  ) {
    if (!this.partyCode || !this.currentCharacter) return;

    this.broadcast({
      type: 'COMBAT_EVENT',
      partyCode: this.partyCode,
      senderId: this.currentCharacter.id,
      senderName: this.currentCharacter.name,
      timestamp: Date.now(),
      payload: { evt, monsterId, damage },
    });
  }

  public broadcastMonsterDefeat(monsterId: string, exp: number, gold: number) {
    if (!this.partyCode || !this.currentCharacter) return;

    this.broadcast({
      type: 'MONSTER_DEFEAT',
      partyCode: this.partyCode,
      senderId: this.currentCharacter.id,
      senderName: this.currentCharacter.name,
      timestamp: Date.now(),
      payload: {
        monsterId,
        exp,
        gold,
        killerName: this.currentCharacter.name,
      },
    });
  }

  public broadcastBreakableHit(breakableId: string) {
    if (!this.partyCode || !this.currentCharacter) return;

    this.broadcast({
      type: 'BREAKABLE_HIT',
      partyCode: this.partyCode,
      senderId: this.currentCharacter.id,
      senderName: this.currentCharacter.name,
      timestamp: Date.now(),
      payload: { breakableId },
    });
  }

  public broadcastPortalTrigger(floorNumber: number, seed?: number) {
    if (!this.partyCode || !this.currentCharacter) return;

    this.broadcast({
      type: 'PORTAL_TRIGGER',
      partyCode: this.partyCode,
      senderId: this.currentCharacter.id,
      senderName: this.currentCharacter.name,
      timestamp: Date.now(),
      payload: {
        floorNumber,
        seed: seed || (floorNumber * 1337 + 42),
        leaderName: this.currentCharacter.name,
      },
    });
  }

  public setLootMode(mode: LootMode) {
    this.lootMode = mode;
    localStorage.setItem('tibia_party_loot_mode', mode);
    if (this.isLeader && this.partyCode && this.currentCharacter) {
      this.broadcast({
        type: 'PARTY_CONFIG',
        partyCode: this.partyCode,
        senderId: this.currentCharacter.id,
        senderName: this.currentCharacter.name,
        timestamp: Date.now(),
        payload: {
          lootMode: this.lootMode,
          experienceSharing: this.experienceSharing,
        },
      });
    }
    this.notifyPartyUpdate();
  }

  public setExperienceSharing(enabled: boolean) {
    this.experienceSharing = enabled;
    localStorage.setItem('tibia_party_exp_sharing', enabled ? 'true' : 'false');
    if (this.isLeader && this.partyCode && this.currentCharacter) {
      this.broadcast({
        type: 'PARTY_CONFIG',
        partyCode: this.partyCode,
        senderId: this.currentCharacter.id,
        senderName: this.currentCharacter.name,
        timestamp: Date.now(),
        payload: {
          lootMode: this.lootMode,
          experienceSharing: this.experienceSharing,
        },
      });
    }
    this.notifyPartyUpdate();
  }

  public getSharedExpBonusPercent(): number {
    if (!this.experienceSharing) return 0;
    const vocations = new Set<string>();
    for (const m of this.members.values()) {
      if (m.isOnline) {
        vocations.add(m.vocation);
      }
    }
    const count = vocations.size;
    if (count <= 1) return 20; // Base shared party bonus (+20%)
    if (count === 2) return 30; // Dual vocation synergy (+30%)
    if (count === 3) return 45; // Trio vocation synergy (+45%)
    return 60; // Full 4 vocations synergy (+60%)
  }

  public checkAndPromoteLeader() {
    if (!this.partyCode || !this.currentCharacter) return;
    const hasActiveLeader = Array.from(this.members.values()).some((m) => m.isLeader && m.isOnline);
    if (!hasActiveLeader && this.members.size > 0) {
      const candidateIds = Array.from(this.members.keys()).sort();
      const newLeaderId = candidateIds[0];
      if (newLeaderId === this.currentCharacter.id) {
        this.isLeader = true;
        localStorage.setItem('tibia_party_is_leader', 'true');
        const me = this.members.get(this.currentCharacter.id);
        if (me) me.isLeader = true;
        this.broadcast({
          type: 'LEADER_CHANGE',
          partyCode: this.partyCode,
          senderId: this.currentCharacter.id,
          senderName: this.currentCharacter.name,
          timestamp: Date.now(),
          payload: { newLeaderId: this.currentCharacter.id },
        });
        this.notifyPartyUpdate();
      }
    }
  }

  public broadcastPartyChat(text: string) {
    if (!this.partyCode || !this.currentCharacter) return;

    this.broadcast({
      type: 'PARTY_CHAT',
      partyCode: this.partyCode,
      senderId: this.currentCharacter.id,
      senderName: this.currentCharacter.name,
      timestamp: Date.now(),
      payload: { text },
    });
  }

  private sendHeartbeat() {
    if (!this.partyCode || !this.currentCharacter) return;

    const myMember = this.members.get(this.currentCharacter.id);
    if (myMember) {
      myMember.lastSeen = Date.now();
      this.broadcast({
        type: 'PARTY_HEARTBEAT',
        partyCode: this.partyCode,
        senderId: myMember.id,
        senderName: myMember.name,
        timestamp: Date.now(),
        payload: myMember,
      });
    }
  }

  private cleanStaleMembers() {
    const now = Date.now();
    let changed = false;
    for (const [id, m] of this.members.entries()) {
      if (this.currentCharacter && id === this.currentCharacter.id) continue;
      // If no heartbeat for 12 seconds, remove from active party list
      if (now - m.lastSeen > 12000) {
        this.members.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.checkAndPromoteLeader();
      this.notifyPartyUpdate();
    }
  }

  private stateListeners: Set<(state: PartyState) => void> = new Set();
  public onPartyStateChange?: (state: PartyState) => void;

  public subscribePartyState(cb: (state: PartyState) => void): () => void {
    this.stateListeners.add(cb);
    try {
      cb(this.getPartyState());
    } catch (e) {
      console.error('Error in party listener:', e);
    }
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  public getPartyState(): PartyState {
    const code = this.partyCode || '';
    let leaderId = '';
    for (const m of this.members.values()) {
      if (m.isLeader) {
        leaderId = m.id;
        break;
      }
    }
    if (!leaderId && this.isLeader && this.currentCharacter) {
      leaderId = this.currentCharacter.id;
    }

    return {
      code,
      partyCode: code,
      leaderId,
      members: Array.from(this.members.values()),
      lootMode: this.lootMode,
      experienceSharing: this.experienceSharing,
      sharedExpBonusPercent: this.getSharedExpBonusPercent(),
    };
  }

  private notifyPartyUpdate() {
    const list = Array.from(this.members.values());
    this.onPartyUpdate?.(list, this.partyCode);
    const state = this.getPartyState();
    this.stateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in party state listener:', err);
      }
    });
    if (this.onPartyStateChange) {
      try {
        this.onPartyStateChange(state);
      } catch (err) {
        console.error('Error in onPartyStateChange:', err);
      }
    }
  }

  public dispose() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const partyNetwork = new PartyNetworkManager();
