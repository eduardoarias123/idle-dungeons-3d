import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CharacterData, EntityState, DropItemEntity, CombatEvent, OfflineReport, VocationType, EquipmentSlot, DungeonFloorInfo, MarketListing } from './types/game';
import { gameSocket } from './game-client/network/GameSocket';
import { GameEngine } from './game-client/engine/GameEngine';
import { sounds } from './game-client/audio/SoundEffects';
import { HeaderHUD } from './components/hud/HeaderHUD';
import { SidebarHUD } from './components/hud/SidebarHUD';
import { ActionBar } from './components/hud/ActionBar';
import { MobileControls } from './components/hud/MobileControls';
import { InventoryModal } from './components/windows/InventoryModal';
import { SkillsModal } from './components/windows/SkillsModal';
import { SpellsModal } from './components/windows/SpellsModal';
import { HuntsModal } from './components/windows/HuntsModal';
import { BestiaryModal } from './components/windows/BestiaryModal';
import { EnchantingModal } from './components/windows/EnchantingModal';
import { MarketplaceModal } from './components/windows/MarketplaceModal';
import { BossVictoryModal, BossDefeatedData } from './components/windows/BossVictoryModal';
import { PartyModal } from './components/windows/PartyModal';
import { PartyHUD } from './components/hud/PartyHUD';
import { ChatWindow, ChatMessage } from './components/windows/ChatWindow';
import { OfflineReportModal } from './components/windows/OfflineReportModal';
import { AccountGatewayModal } from './components/windows/AccountGatewayModal';
import { VocationResetModal } from './components/windows/VocationResetModal';
import { FeedbackBugModal } from './components/windows/FeedbackBugModal';
import { PlaytestTutorialModal } from './components/windows/PlaytestTutorialModal';
import { SaveBackupModal } from './components/windows/SaveBackupModal';
import { DonateModal } from './components/windows/DonateModal';
import { PerfMonitor } from './components/hud/PerfMonitor';
import { WaveTransitionOverlay, WaveTransitionData, BossAlertData } from './components/hud/WaveTransitionOverlay';
import { ComboCounterHUD } from './components/hud/ComboCounterHUD';
import { AnalyzerOverlay } from './components/hud/AnalyzerOverlay';
import { MAPS_DATABASE } from './constants/maps';
import { logger } from './utils/logger';
import { Sparkles, Skull } from 'lucide-react';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // State
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const characterRef = useRef<CharacterData | null>(null);

  // Contador de erros do tick para evitar spam de logs (o tick roda ~40x/s)
  const tickErrorsRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const selectedTargetIdRef = useRef<string | null>(null);

  const [isAutoHunting, setIsAutoHunting] = useState(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  const [waveInfo, setWaveInfo] = useState<{ currentWave: number; waveKills: number; waveTarget: number; bossAlive: boolean } | undefined>(undefined);
  const [floorInfo, setFloorInfo] = useState<DungeonFloorInfo | undefined>(undefined);
  const [waveTransitionData, setWaveTransitionData] = useState<WaveTransitionData | null>(null);
  const [bossAlertData, setBossAlertData] = useState<BossAlertData | null>(null);
  const [bossVictoryData, setBossVictoryData] = useState<BossDefeatedData | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [targetEntity, setTargetEntity] = useState<EntityState | null>(null);
  const [comboHits, setComboHits] = useState(0);
  const lastCombatHitTimeRef = useRef(0);

  // Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isSpellsOpen, setIsSpellsOpen] = useState(false);
  const [isHuntsOpen, setIsHuntsOpen] = useState(false);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState(false);
  const [isEnchantingOpen, setIsEnchantingOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isVocationResetOpen, setIsVocationResetOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSaveBackupOpen, setIsSaveBackupOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isLunia25D, setIsLunia25D] = useState(true);
  const [engineInstance, setEngineInstance] = useState<GameEngine | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Auto-prompt tutorial for first-time private testers
  useEffect(() => {
    if (isJoined && localStorage.getItem('tibia_tutorial_completed') !== 'true') {
      const timer = setTimeout(() => setIsTutorialOpen(true), 900);
      return () => clearTimeout(timer);
    }
  }, [isJoined]);

  const handleToggleCamera = useCallback(() => {
    if (engineRef.current) {
      const active = engineRef.current.toggleLunia25D();
      setIsLunia25D(active);
    }
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  const updateSelectedTarget = (targetId: string | null) => {
    setSelectedTargetId(targetId);
    selectedTargetIdRef.current = targetId;
  };

  // Initialize GameEngine
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;
    setEngineInstance(engine);

    // Connect Engine Click Events
    engine.onGroundClick = (x, z) => {
      // Clicking the map cancels the active monster target
      if (selectedTargetIdRef.current) {
        updateSelectedTarget(null);
        gameSocket.selectTarget(null);
      }
      gameSocket.move(x, z);
    };

    engine.onEntityClick = (entityId) => {
      updateSelectedTarget(entityId);
      gameSocket.selectTarget(entityId);
      sounds.playSwordSwing();
    };

    engine.onBreakableClick = (breakableId) => {
      gameSocket.interactBreakable(breakableId);
      sounds.playSwordSwing();
    };

    engine.onNpcClick = (npcId) => {
      sounds.playSwordSwing();
      if (npcId === 'npc_captain') {
        setIsHuntsOpen(true);
      } else if (npcId === 'npc_blacksmith') {
        setIsEnchantingOpen(true);
      } else if (npcId === 'npc_alchemist') {
        setIsMarketOpen(true);
      } else if (npcId === 'npc_stash') {
        setIsInventoryOpen(true);
      }
    };

    engine.onPortalClick = () => {
      gameSocket.descendFloor();
      sounds.playLevelUp();
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
      setEngineInstance(null);
    };
  }, []);

  // Connect & Bind WebSocket Listeners BEFORE checking localStorage
  const handleJoin = useCallback((name: string, vocation: VocationType) => {
    localStorage.setItem('tibia_dungeons_char_name', name);
    localStorage.setItem('tibia_dungeons_char_voc', vocation);
    logger.event('App.handleJoin', `Login solicitado: "${name}" (${vocation}).`, {
      href: typeof window !== 'undefined' ? window.location.href : '',
    });
    setIsJoined(true);
    try {
      gameSocket.connect(name, vocation);
      logger.event('App.handleJoin', `gameSocket.connect() concluído sem exceção para "${name}".`);
    } catch (e) {
      logger.exception('App.handleJoin', `gameSocket.connect() lançou exceção para "${name}"`, e);
      setAppError(String(e));
      setIsJoined(false);
    }
  }, []);

  const handleSelectCharacter = useCallback((char: CharacterData) => {
    logger.event('App.handleSelectCharacter', `Personagem selecionado na tela de seleção: "${char.name}".`, {
      id: char.id,
      vocation: char.vocation,
      level: char.level,
      currentMapId: char.currentMapId,
      hp: char.hp,
      maxHp: char.maxHp,
      unlockedSpells: char.unlockedSpells?.length,
    });
    handleJoin(char.name, char.vocation);
  }, [handleJoin]);

  const handleCreateNewCharacter = useCallback((name: string, vocation: VocationType, email: string) => {
    const accountsKey = 'tibia_accounts_db';
    const dbRaw = localStorage.getItem(accountsKey);
    let db: Record<string, CharacterData[]> = {};
    try {
      db = dbRaw ? JSON.parse(dbRaw) : {};
    } catch (e) {
      logger.exception(
        'App.handleCreateNewCharacter',
        'localStorage "tibia_accounts_db" corrompido; recriando banco de contas vazio',
        e,
        { dbRawLength: dbRaw?.length ?? 0 }
      );
      db = {};
    }

    if (!db[email]) db[email] = [];

    const newChar: CharacterData = {
      id: 'char_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name,
      vocation,
      promoted: false,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      hp: 185,
      maxHp: 185,
      mana: 35,
      maxMana: 35,
      capacity: 450,
      gold: 500,
      skills: {
        sword: 10, swordTries: 0,
        axe: 10, axeTries: 0,
        club: 10, clubTries: 0,
        distance: 10, distanceTries: 0,
        shielding: 10, shieldingTries: 0,
        magic: 10, manaSpent: 0
      },
      equipment: {},
      inventory: [],
      currentMapId: 'HUB_THAIS',
      lastSavedAt: Date.now(),
      killsCount: 0,
      bossKills: 0,
      highestWaveCompleted: {},
      unlockedSpells: ['exura', 'exori'],
    };

    db[email].push(newChar);
    localStorage.setItem(accountsKey, JSON.stringify(db));

    logger.event('App.handleCreateNewCharacter', `Novo personagem criado no navegador: "${name}" (${vocation}).`, {
      email,
      id: newChar.id,
      totalPersonagens: db[email].length,
    });

    handleJoin(name, vocation);
  }, [handleJoin]);

  useEffect(() => {
    gameSocket.onConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    gameSocket.onWelcome = ({ playerId, character: welcomeChar, mapId, offlineReport }) => {
      logger.event('App.onWelcome', `Motor confirmou a entrada de "${welcomeChar?.name}" no mapa ${mapId}.`, {
        playerId,
        vocation: welcomeChar?.vocation,
        level: welcomeChar?.level,
        hp: welcomeChar?.hp,
        maxHp: welcomeChar?.maxHp,
        currentMapId: welcomeChar?.currentMapId,
        temOfflineReport: Boolean(offlineReport),
      });
      try {
        characterRef.current = welcomeChar;
        setCharacter(welcomeChar);
        setIsAutoHunting(Boolean(welcomeChar.autoHuntActive));
        if (offlineReport && (offlineReport.monstersKilled > 0 || offlineReport.expGained > 0)) {
          setOfflineReport(offlineReport);
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: 'welcome_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            sender: 'System',
            text: `Welcome to Tibia Dungeons 3D, ${welcomeChar.name}! You are currently in ${MAPS_DATABASE[mapId]?.name || mapId}.`,
            channel: 'server',
            timestamp: Date.now(),
          },
        ]);
      } catch (e) {
        logger.exception('App.onWelcome', 'Erro ao processar o pacote de boas-vindas (welcome)', e, { mapId });
      }
    };

    gameSocket.onCharacterSync = (char) => {
      try {
        characterRef.current = char;
        setCharacter(char);
        setIsAutoHunting(Boolean(char.autoHuntActive));
      } catch (e) {
        logger.exception('App.onCharacterSync', 'Erro ao sincronizar o personagem', e, { charId: char?.id });
      }
    };

    gameSocket.onLevelUp = ({ level, hpGain, manaGain }) => {
      sounds.playLevelUp();
      setChatMessages((prev) => [
        ...prev,
        {
          id: 'lvl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          sender: 'Level Up',
          text: `ADVANCE! You have advanced to Level ${level}! (+${hpGain} HP, +${manaGain} Mana)`,
          channel: 'server',
          color: '#facc15',
          timestamp: Date.now(),
        },
      ]);
    };

    gameSocket.onSkillUp = ({ skill, newLevel }) => {
      sounds.playHeal();
      setChatMessages((prev) => [
        ...prev,
        {
          id: 'sk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          sender: 'Skill Advance',
          text: `Your ${skill} has advanced to skill level ${newLevel}!`,
          channel: 'server',
          color: '#38bdf8',
          timestamp: Date.now(),
        },
      ]);
    };

    gameSocket.onChat = (msg) => {
      setChatMessages((prev) => [
        ...prev.slice(-60),
        {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          sender: msg.sender,
          text: msg.text,
          channel: msg.channel,
          color: msg.color,
          timestamp: Date.now(),
        },
      ]);
    };

    gameSocket.onLoot = ({ itemDefId, count, gold, rarity }) => {
      sounds.playCoin();
      const goldText = gold > 0 ? `${gold} gold coins` : '';
      const itemText = itemDefId ? `${itemDefId} x${count}` : '';
      const text = [goldText, itemText].filter(Boolean).join(' and ');

      setChatMessages((prev) => [
        ...prev.slice(-60),
        {
          id: 'loot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          sender: 'Loot',
          text: `Looted: ${text}`,
          channel: 'loot',
          color: rarity === 'unique' ? '#f59e0b' : rarity === 'rare' ? '#38bdf8' : '#e2e8f0',
          timestamp: Date.now(),
        },
      ]);
    };

    gameSocket.onAutoHuntSync = (enabled) => {
      setIsAutoHunting(enabled);
    };

    gameSocket.onMarketSync = (listings) => {
      setMarketListings(listings);
    };

    gameSocket.onWaveTransition = (data) => {
      setWaveTransitionData(data);
      sounds.playWaveTransition();

      // Trigger subtle 3D camera isometric shake
      if (engineRef.current) {
        engineRef.current.triggerScreenShake(0.65, 0.55);
      }

      // Trigger subtle CSS screen shake on viewport
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 520);
    };

    gameSocket.onBossSpawned = (data) => {
      setBossAlertData(data);
      sounds.playBossAwakening();

      // Trigger subtle 3D camera rumble
      if (engineRef.current) {
        engineRef.current.triggerScreenShake(0.45, 0.4);
      }

      // Trigger subtle CSS screen shake
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 460);
    };

    gameSocket.onBossVictory = (data) => {
      setBossVictoryData(data);
      sounds.playBossAwakening();
    };

    gameSocket.onTick = ({ mapId, entities, drops, combatEvents, hazards, waveInfo: newWaveInfo, breakables, floorInfo: newFloorInfo, targetId: currentEngineTargetId }) => {
      const currentChar = characterRef.current;
      if (currentEngineTargetId !== undefined && selectedTargetIdRef.current !== currentEngineTargetId) {
        updateSelectedTarget(currentEngineTargetId);
      }
      const currentTargetId = selectedTargetIdRef.current;

      if (engineRef.current && currentChar) {
        try {
          engineRef.current.updateState(
            mapId,
            entities,
            drops,
            combatEvents,
            currentChar.id,
            currentTargetId,
            hazards,
            breakables,
            newFloorInfo
          );
        } catch (e) {
          tickErrorsRef.current += 1;
          if (tickErrorsRef.current <= 5 || tickErrorsRef.current % 200 === 0) {
            logger.exception(
              'App.onTick/updateState',
              `Falha ao atualizar o motor 3D (ocorrência #${tickErrorsRef.current})`,
              e,
              {
                mapId,
                entitiesCount: entities?.length,
                dropsCount: drops?.length,
                combatEventsCount: combatEvents?.length,
                temFloorInfo: Boolean(newFloorInfo),
              }
            );
          }
        }

        // Synchronize target entity health bar
        if (currentTargetId) {
          const t = entities.find((e) => e.id === currentTargetId);
          setTargetEntity(t || null);
          if (!t) {
            updateSelectedTarget(null);
          }
        } else {
          setTargetEntity(null);
        }

        // Sounds & Lunia Combo Hits for combat events
        try {
          let hitsThisTick = 0;
          for (const evt of combatEvents) {
            if (evt.isHeal) sounds.playHeal();
            else if (evt.spellWords) sounds.playSpellCast();
            else if (evt.vfxType === 'spectral_dash') sounds.playDash();
            else if (evt.damage > 0) {
              sounds.playHitSound();
              if (evt.sourceId === currentChar.id || evt.sourceId === 'player') {
                hitsThisTick++;
              }
            }
          }

          if (hitsThisTick > 0) {
            const now = Date.now();
            if (now - lastCombatHitTimeRef.current > 2500) {
              setComboHits(hitsThisTick);
            } else {
              setComboHits((prev) => prev + hitsThisTick);
            }
            lastCombatHitTimeRef.current = now;
          }
        } catch (e) {
          tickErrorsRef.current += 1;
          if (tickErrorsRef.current <= 5 || tickErrorsRef.current % 200 === 0) {
            logger.exception(
              'App.onTick/efeitos',
              `Falha ao processar sons/combo (ocorrência #${tickErrorsRef.current})`,
              e,
              { combatEventsCount: combatEvents?.length }
            );
          }
        }
      }

      setWaveInfo((prev) => {
        if (!prev && !newWaveInfo) return prev;
        if (
          prev &&
          newWaveInfo &&
          prev.currentWave === newWaveInfo.currentWave &&
          prev.waveKills === newWaveInfo.waveKills &&
          prev.waveTarget === newWaveInfo.waveTarget &&
          prev.bossAlive === newWaveInfo.bossAlive
        ) {
          return prev;
        }
        return newWaveInfo || undefined;
      });

      setFloorInfo((prev) => {
        if (!prev && !newFloorInfo) return prev;
        if (
          prev &&
          newFloorInfo &&
          prev.floorNumber === newFloorInfo.floorNumber &&
          prev.bossDefeated === newFloorInfo.bossDefeated &&
          prev.portalOpen === newFloorInfo.portalOpen &&
          prev.seed === newFloorInfo.seed
        ) {
          return prev;
        }
        return newFloorInfo || undefined;
      });
    };

    // Clear legacy single-char auto-join to enforce Account Gateway login
    localStorage.removeItem('tibia_dungeons_char_name');
    localStorage.removeItem('tibia_dungeons_char_voc');
  }, [handleJoin]);

  const handleDirectionMove = useCallback((dx: number, dz: number) => {
    gameSocket.moveDirection(dx, dz);
  }, []);

  const handleAutoTarget = useCallback(() => {
    // Select nearest monster automatically
    gameSocket.selectTarget('AUTO');
    sounds.playSwordSwing();
  }, []);

  // Global Keyboard Shortcuts (WASD / Arrows / Hotkeys / Free Action continuous input)
  const activeMovementKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const updateMovement = () => {
      const keys = activeMovementKeysRef.current;
      let vx = 0;
      let vz = 0;

      if (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyQ') || keys.has('KeyE') || keys.has('Numpad7') || keys.has('Numpad8') || keys.has('Numpad9')) vz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown') || keys.has('KeyZ') || keys.has('KeyC') || keys.has('Numpad1') || keys.has('Numpad2') || keys.has('Numpad3')) vz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('KeyQ') || keys.has('KeyZ') || keys.has('Numpad4') || keys.has('Numpad7') || keys.has('Numpad1')) vx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight') || keys.has('KeyE') || keys.has('KeyC') || keys.has('Numpad6') || keys.has('Numpad9') || keys.has('Numpad3')) vx += 1;

      if (vx !== 0 || vz !== 0) {
        gameSocket.moveContinuous(vx, vz, true);
      } else {
        gameSocket.moveContinuous(0, 0, false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing inside inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const k = e.key.toLowerCase();
      const code = e.code;

      const movementCodes = [
        'KeyW', 'KeyS', 'KeyA', 'KeyD',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyQ', 'KeyE', 'KeyZ', 'KeyC',
        'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
      ];

      if (movementCodes.includes(code)) {
        e.preventDefault();
        const wasEmpty = activeMovementKeysRef.current.size === 0;
        activeMovementKeysRef.current.add(code);
        updateMovement();

        // If newly pressed in classic mode, send immediate step
        if (wasEmpty || !e.repeat) {
          let stepX = 0;
          let stepZ = 0;
          if (code === 'KeyW' || code === 'ArrowUp' || k === 'w') stepZ = -1;
          else if (code === 'KeyS' || code === 'ArrowDown' || k === 's') stepZ = 1;
          else if (code === 'KeyA' || code === 'ArrowLeft' || k === 'a') stepX = -1;
          else if (code === 'KeyD' || code === 'ArrowRight' || k === 'd') stepX = 1;
          else if (code === 'KeyQ' || code === 'Numpad7' || k === 'q') { stepX = -1; stepZ = -1; }
          else if (code === 'KeyE' || code === 'Numpad9' || k === 'e') { stepX = 1; stepZ = -1; }
          else if (code === 'KeyZ' || code === 'Numpad1' || k === 'z') { stepX = -1; stepZ = 1; }
          else if (code === 'KeyC' || code === 'Numpad3' || k === 'c') { stepX = 1; stepZ = 1; }
          if (stepX !== 0 || stepZ !== 0) {
            handleDirectionMove(stepX, stepZ);
          }
        }
        return;
      }

      // 2. Combat & Target Actions
      if (code === 'Space') {
        e.preventDefault();
        gameSocket.dash();
      } else if (code === 'Tab') {
        e.preventDefault();
        handleAutoTarget();
      } else if (code === 'KeyR') {
        e.preventDefault();
        handleUsePotion('health');
      } else if (code === 'KeyF') {
        e.preventDefault();
        handleUsePotion('mana');
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(code)) {
        const index = parseInt(code.replace('Digit', ''), 10) - 1;
        const char = characterRef.current;
        if (char && char.unlockedSpells && char.unlockedSpells[index]) {
          e.preventDefault();
          const aim = engineRef.current ? engineRef.current.getAimTarget() : undefined;
          gameSocket.castSpell(char.unlockedSpells[index], aim?.x, aim?.z, selectedTargetIdRef.current);
        }
      }
      else if (code === 'Escape' || k === 'escape') {
        if (selectedTargetIdRef.current) {
          e.preventDefault();
          updateSelectedTarget(null);
          gameSocket.selectTarget(null);
        } else {
          setIsInventoryOpen(false);
          setIsSkillsOpen(false);
          setIsSpellsOpen(false);
          setIsHuntsOpen(false);
          setIsBestiaryOpen(false);
          setIsPartyOpen(false);
          setIsEnchantingOpen(false);
          setIsMarketOpen(false);
          setIsTutorialOpen(false);
        }
      }
      // 3. UI Window Modals
      else if (k === 'i') setIsInventoryOpen((p) => !p);
      else if (k === 'k') setIsSkillsOpen((p) => !p);
      else if (k === 'j') setIsSpellsOpen((p) => !p);
      else if (k === 'm') setIsHuntsOpen((p) => !p);
      else if (k === 'b') setIsBestiaryOpen((p) => !p);
      else if (k === 'p') setIsPartyOpen((p) => !p);
      else if (k === 'v') handleToggleCamera();
      else if (k === 'h') setIsTutorialOpen((p) => !p);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeMovementKeysRef.current.has(e.code)) {
        activeMovementKeysRef.current.delete(e.code);
        updateMovement();
      }
    };

    const handleWindowBlur = () => {
      if (activeMovementKeysRef.current.size > 0) {
        activeMovementKeysRef.current.clear();
        gameSocket.moveContinuous(0, 0, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleDirectionMove, handleAutoTarget]);

  // Action handlers
  const handleToggleAutoHunt = () => {
    const next = !isAutoHunting;
    setIsAutoHunting(next);
    gameSocket.toggleAutoHunt(next);
    sounds.playSwordSwing();
  };

  const handleRestAtShrine = () => {
    gameSocket.restAtShrine();
    sounds.playHeal();
  };

  const handleCastSpell = (spellId: string) => {
    const aim = engineRef.current ? engineRef.current.getAimTarget() : undefined;
    gameSocket.castSpell(spellId, aim?.x, aim?.z, selectedTargetIdRef.current);
  };

  const handleUsePotion = (type: 'health' | 'mana') => {
    gameSocket.usePotion(type);
    sounds.playHeal();
  };

  const handleEquipItem = (instanceId: string, slot: EquipmentSlot) => {
    gameSocket.equipItem(instanceId, slot);
  };

  const handleUnequipItem = (slot: EquipmentSlot) => {
    gameSocket.unequipItem(slot);
  };

  const handleSellItem = (instanceId: string) => {
    gameSocket.dropOrSellItem(instanceId);
  };

  const handleClearTransition = useCallback(() => setWaveTransitionData(null), []);
  const handleClearBossAlert = useCallback(() => setBossAlertData(null), []);

  const handleSwitchMap = (mapId: string, difficulty?: 'easy' | 'medium' | 'hard') => {
    setBossAlertData(null);
    setWaveTransitionData(null);
    gameSocket.switchMap(mapId, difficulty);
  };

  const handleSendMessage = (text: string) => {
    gameSocket.sendChat(text);
  };

  const handleChangeVocation = (vocation: VocationType) => {
    gameSocket.changeVocation(vocation);
  };

  const handleResetCharacter = (name: string, vocation: VocationType) => {
    gameSocket.resetCharacter(name, vocation);
  };

  const currentMap = character ? MAPS_DATABASE[character.currentMapId] || MAPS_DATABASE.HUB_THAIS : MAPS_DATABASE.HUB_THAIS;

  return (
    <>
      {appError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6 text-slate-200 font-mono">
          <div className="max-w-lg w-full">
            <h1 className="text-red-400 font-bold text-xl mb-3">Application Crash</h1>
            <div className="bg-black/60 border border-red-500/40 rounded p-4 text-xs whitespace-pre-wrap mb-4">{appError}</div>
            <button onClick={() => setAppError(null)} className="px-4 py-2 bg-amber-500 text-black font-bold rounded cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}
      <main className={`relative w-screen h-screen overflow-hidden bg-zinc-950 select-none ${isScreenShaking ? 'animate-wave-shake' : ''}`}>
      {/* 3D Render Canvas with Performance Monitor & Mobile Optimization */}
      <PerfMonitor engine={engineInstance}>
        <div
          id="game-canvas-container"
          ref={containerRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />
      </PerfMonitor>

      {/* Main HUD */}
      {character && (
        <>
          <HeaderHUD
            character={character}
            isConnected={isConnected}
            isAutoHunting={isAutoHunting}
            waveInfo={waveInfo}
            floorInfo={floorInfo}
            targetEntity={targetEntity}
            isChatOpen={isChatOpen}
            isLunia25D={isLunia25D}
            onToggleCamera={handleToggleCamera}
            onToggleAutoHunt={handleToggleAutoHunt}
            onRestAtShrine={handleRestAtShrine}
            onDescendFloor={() => {
              gameSocket.descendFloor();
              sounds.playLevelUp();
            }}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenSkills={() => setIsSkillsOpen(true)}
            onOpenSpells={() => setIsSpellsOpen(true)}
            onOpenHunts={() => setIsHuntsOpen(true)}
            onOpenBestiary={() => setIsBestiaryOpen(true)}
            onOpenEnchanting={() => setIsEnchantingOpen(true)}
            onOpenMarket={() => setIsMarketOpen(true)}
            onOpenParty={() => setIsPartyOpen(true)}
            onToggleChat={() => setIsChatOpen((p) => !p)}
            onOpenVocationReset={() => setIsVocationResetOpen(true)}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOpenSaveBackup={() => setIsSaveBackupOpen(true)}
            onOpenDonate={() => setIsDonateOpen(true)}
            onCancelTarget={() => {
              updateSelectedTarget(null);
              gameSocket.selectTarget(null);
            }}
          />

          <SidebarHUD
            character={character}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenSkills={() => setIsSkillsOpen(true)}
            onUnequip={handleUnequipItem}
            onUseItem={(defId) => handleUsePotion(defId.includes('mana') ? 'mana' : 'health')}
            isConnected={isConnected}
          />

          <PartyHUD
            character={character}
            onOpenPartyModal={() => setIsPartyOpen(true)}
          />

          <AnalyzerOverlay character={character} />

          <ComboCounterHUD comboHits={comboHits} />

          <ActionBar
            character={character}
            onCastSpell={handleCastSpell}
            onUsePotion={handleUsePotion}
            onAutoTarget={handleAutoTarget}
            onSetStance={(stance) => gameSocket.setStance(stance)}
            isAutoHunting={isAutoHunting}
            onToggleAutoHunt={handleToggleAutoHunt}
          />

          <MobileControls
            onDirectionMove={handleDirectionMove}
            onAttack={handleAutoTarget}
            onUsePotion={() => handleUsePotion('health')}
            onCastPrimary={() => {
              if (character.unlockedSpells[0]) {
                handleCastSpell(character.unlockedSpells[0]);
              }
            }}
          />

          {/* Windows / Modals */}
          <InventoryModal
            character={character}
            isOpen={isInventoryOpen}
            onClose={() => setIsInventoryOpen(false)}
            onEquip={handleEquipItem}
            onUnequip={handleUnequipItem}
            onUseItem={(id) => handleUsePotion(id.includes('mana') ? 'mana' : 'health')}
            onSellItem={handleSellItem}
          />

          <SkillsModal
            character={character}
            isOpen={isSkillsOpen}
            onClose={() => setIsSkillsOpen(false)}
            onOpenVocationReset={() => setIsVocationResetOpen(true)}
          />

          <VocationResetModal
            character={character}
            isOpen={isVocationResetOpen}
            onClose={() => setIsVocationResetOpen(false)}
            onChangeVocation={handleChangeVocation}
            onResetCharacter={handleResetCharacter}
          />

          <SpellsModal
            character={character}
            isOpen={isSpellsOpen}
            onClose={() => setIsSpellsOpen(false)}
            onCastSpell={handleCastSpell}
          />

          <HuntsModal
            character={character}
            isOpen={isHuntsOpen}
            onClose={() => setIsHuntsOpen(false)}
            onSwitchMap={handleSwitchMap}
          />

          <BestiaryModal
            character={character}
            isOpen={isBestiaryOpen}
            onClose={() => setIsBestiaryOpen(false)}
          />

          <EnchantingModal
            character={character}
            isOpen={isEnchantingOpen}
            onClose={() => setIsEnchantingOpen(false)}
          />

          <MarketplaceModal
            character={character}
            listings={marketListings}
            isOpen={isMarketOpen}
            onClose={() => setIsMarketOpen(false)}
          />

          <PartyModal
            character={character}
            isOpen={isPartyOpen}
            onClose={() => setIsPartyOpen(false)}
            onSwitchMap={handleSwitchMap}
          />

          <ChatWindow
            messages={chatMessages}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            onSendMessage={handleSendMessage}
          />

          <OfflineReportModal
            report={offlineReport}
            onClaim={() => setOfflineReport(null)}
          />

          <FeedbackBugModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            character={character}
            isAutoHunting={isAutoHunting}
            floorNumber={floorInfo?.floorNumber}
            recentLogs={chatMessages.map((m) => `[${m.channel}] ${m.sender}: ${m.text}`)}
          />

          <PlaytestTutorialModal
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
          />

          <SaveBackupModal
            isOpen={isSaveBackupOpen}
            onClose={() => setIsSaveBackupOpen(false)}
            character={character}
          />

          <DonateModal
            isOpen={isDonateOpen}
            onClose={() => setIsDonateOpen(false)}
          />
        </>
      )}

      {/* Wave Transition & Boss Alert Screen Flash & Signals */}
      <WaveTransitionOverlay
        transitionData={waveTransitionData}
        bossAlert={bossAlertData}
        onClearTransition={handleClearTransition}
        onClearBossAlert={handleClearBossAlert}
      />

      <BossVictoryModal
        data={bossVictoryData}
        onClose={() => setBossVictoryData(null)}
      />

      {/* Account Gateway / Character Select */}
      <AccountGatewayModal
        isOpen={!isJoined}
        onSelectCharacter={handleSelectCharacter}
        onCreateNewCharacter={handleCreateNewCharacter}
      />
    </main>
    </>
  );
}

export default App;
