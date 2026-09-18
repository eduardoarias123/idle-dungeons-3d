import { ClientPacket, ServerPacket, CharacterData, EntityState, DropItemEntity, CombatEvent, OfflineReport, ItemRarity, HazardField, BreakableObject, DungeonFloorInfo, CombatStance, MarketListing } from '../../types/game';
import { LocalGameEngine } from './LocalGameEngine';

type PacketCallback<T> = (data: T) => void;

export class GameSocket {
  private isConnected = false;
  private localEngine: LocalGameEngine | null = null;
  private currentCharacterName = '';
  private currentVocation = 'KNIGHT';

  // Callbacks
  public onWelcome: PacketCallback<{ playerId: string; character: CharacterData; mapId: string; offlineReport?: OfflineReport | null; floorInfo?: DungeonFloorInfo }> = () => {};
  public onTick: PacketCallback<{ timestamp: number; mapId: string; entities: EntityState[]; drops: DropItemEntity[]; combatEvents: CombatEvent[]; waveInfo?: any; hazards?: HazardField[]; breakables?: BreakableObject[]; floorInfo?: DungeonFloorInfo; targetId?: string | null }> = () => {};
  public onCharacterSync: PacketCallback<CharacterData> = () => {};
  public onLevelUp: PacketCallback<{ level: number; hpGain: number; manaGain: number }> = () => {};
  public onSkillUp: PacketCallback<{ skill: string; newLevel: number }> = () => {};
  public onChat: PacketCallback<{ sender: string; text: string; channel: 'say' | 'server' | 'loot' | 'party' | 'global'; color?: string }> = () => {};
  public onLoot: PacketCallback<{ itemDefId: string; count: number; gold: number; rarity: ItemRarity }> = () => {};
  public onAutoHuntSync: (enabled: boolean) => void = () => {};
  public onWaveTransition: PacketCallback<{ previousWave: number; newWave: number; bossDefeatedName?: string; mapName?: string }> = () => {};
  public onBossSpawned: PacketCallback<{ wave: number; bossName: string }> = () => {};
  public onBossVictory: PacketCallback<{ bossName: string; expGained: number; goldGained: number; itemsLooted: string[] }> = () => {};
  public onMarketSync: PacketCallback<MarketListing[]> = () => {};
  public onConnectionChange: (connected: boolean) => void = () => {};

  constructor() {
    this.localEngine = new LocalGameEngine();
    this.localEngine.onPacket = (packet) => this.handlePacket(packet);
    this.localEngine.onConnectionChange = (connected) => {
      this.isConnected = connected;
      this.onConnectionChange(connected);
    };
  }

  public connect(characterName: string, vocation: string) {
    this.currentCharacterName = characterName;
    this.currentVocation = vocation;

    // Run purely in client-side Local Game Engine (0ms Latency, Offline / Test Mode)
    if (!this.localEngine) {
      this.localEngine = new LocalGameEngine();
      this.localEngine.onPacket = (packet) => this.handlePacket(packet);
      this.localEngine.onConnectionChange = (connected) => {
        this.isConnected = connected;
        this.onConnectionChange(connected);
      };
    }

    this.localEngine.start(characterName, vocation);
  }

  private handlePacket(packet: ServerPacket) {
    switch (packet.type) {
      case 'welcome':
        this.onWelcome(packet);
        break;
      case 'tick':
        this.onTick(packet);
        break;
      case 'character_sync':
        this.onCharacterSync(packet.character);
        break;
      case 'level_up':
        this.onLevelUp(packet);
        break;
      case 'skill_up':
        this.onSkillUp(packet);
        break;
      case 'chat':
        this.onChat(packet);
        break;
      case 'loot_received':
        this.onLoot(packet);
        break;
      case 'autohunt_sync':
        this.onAutoHuntSync(packet.enabled);
        break;
      case 'wave_transition':
        this.onWaveTransition(packet);
        break;
      case 'boss_spawned':
        this.onBossSpawned(packet);
        break;
      case 'boss_victory':
        this.onBossVictory(packet);
        break;
      case 'market_sync':
        this.onMarketSync(packet.listings);
        break;
    }
  }

  public send(packet: ClientPacket) {
    if (this.localEngine) {
      this.localEngine.handleClientPacket(packet);
    }
  }

  public move(x: number, z: number) {
    this.send({ type: 'move', x, z });
  }

  public moveDirection(dx: number, dz: number) {
    this.send({ type: 'move_direction', dx, dz });
  }

  public moveContinuous(vx: number, vz: number, isMoving: boolean, faceX?: number, faceZ?: number) {
    this.send({ type: 'move_continuous', vx, vz, isMoving, faceX, faceZ });
  }

  public dash() {
    this.send({ type: 'dash' });
  }

  public selectTarget(targetId: string | null) {
    this.send({ type: 'select_target', targetId });
  }

  public toggleAutoHunt(enabled: boolean) {
    this.send({ type: 'toggle_autohunt', enabled });
  }

  public switchMap(mapId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.send({ type: 'switch_map', mapId, difficulty });
  }

  public castSpell(spellId: string, aimX?: number, aimZ?: number, targetId?: string | null) {
    this.send({ type: 'cast_spell', spellId, aimX, aimZ, targetId });
  }

  public usePotion(potionType: 'health' | 'mana') {
    this.send({ type: 'use_potion', potionType });
  }

  public setStance(stance: CombatStance) {
    this.send({ type: 'set_stance', stance });
  }

  public equipItem(instanceId: string, slot: any) {
    this.send({ type: 'equip_item', instanceId, slot });
  }

  public enchantItem(instanceId: string, enchantmentId: string) {
    this.send({ type: 'enchant_item', instanceId, enchantmentId });
  }

  public marketBuy(listingId: string) {
    this.send({ type: 'market_buy', listingId });
  }

  public marketListItem(instanceId: string, priceGold: number) {
    this.send({ type: 'market_list_item', instanceId, priceGold });
  }

  public marketCancelListing(listingId: string) {
    this.send({ type: 'market_cancel_listing', listingId });
  }

  public unequipItem(slot: any) {
    this.send({ type: 'unequip_item', slot });
  }

  public dropOrSellItem(instanceId: string) {
    this.send({ type: 'drop_or_sell_item', instanceId });
  }

  public restAtShrine() {
    this.send({ type: 'rest_at_shrine' });
  }

  public changeVocation(vocation: any) {
    this.currentVocation = vocation;
    this.send({ type: 'change_vocation', vocation });
  }

  public resetCharacter(characterName: string, vocation: any) {
    this.currentCharacterName = characterName;
    this.currentVocation = vocation;
    this.send({ type: 'reset_character', characterName, vocation });
  }

  public descendFloor() {
    this.send({ type: 'descend_floor' });
  }

  public interactBreakable(breakableId: string) {
    this.send({ type: 'interact_breakable', breakableId });
  }

  public buyItem(itemDefId: string, count: number = 1) {
    this.send({ type: 'buy_item', itemDefId, count });
  }

  public stashDeposit(instanceId: string) {
    this.send({ type: 'stash_deposit', instanceId });
  }

  public stashWithdraw(instanceId: string) {
    this.send({ type: 'stash_withdraw', instanceId });
  }

  public claimBounty(bountyId: string) {
    this.send({ type: 'bounty_claim', bountyId });
  }

  public sendChat(text: string, channel: 'say' | 'server' | 'party' | 'global' = 'global') {
    this.send({ type: 'chat', text, channel });
  }

  public async forceSave(): Promise<boolean> {
    if (!this.localEngine) return false;
    return await this.localEngine.syncCharacterToServer();
  }

  public importSave(data: CharacterData): boolean {
    if (!this.localEngine) return false;
    return this.localEngine.importSaveData(data);
  }

  public disconnect() {
    if (this.localEngine) {
      this.localEngine.stop();
    }
    this.isConnected = false;
  }
}

export const gameSocket = new GameSocket();

