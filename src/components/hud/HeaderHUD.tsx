import React from 'react';
import { CharacterData, DungeonFloorInfo, EntityState } from '../../types/game';
import { VOCATIONS, getExperienceForLevel } from '../../constants/vocations';
import { MAPS_DATABASE } from '../../constants/maps';
import {
  Shield,
  Volume2,
  VolumeX,
  Coins,
  Sparkles,
  RotateCcw,
  Bot,
  Swords,
  Backpack,
  BookOpen,
  Scroll,
  MapPin,
  MessageSquare,
  HeartHandshake,
  Skull,
  ArrowDownCircle,
  Trophy,
  Users,
  Eye,
  Camera,
  Bug,
  HelpCircle,
  Cloud,
  ShoppingBag,
  X,
  Zap,
  Crown,
  Heart,
} from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface HeaderHUDProps {
  character: CharacterData;
  isConnected: boolean;
  isAutoHunting?: boolean;
  waveInfo?: { currentWave: number; waveKills: number; waveTarget: number; bossAlive: boolean };
  floorInfo?: DungeonFloorInfo;
  targetEntity?: EntityState | null;
  isChatOpen?: boolean;
  isLunia25D?: boolean;
  onToggleCamera?: () => void;
  onToggleAutoHunt?: () => void;
  onRestAtShrine?: () => void;
  onDescendFloor?: () => void;
  onOpenInventory: () => void;
  onOpenSkills: () => void;
  onOpenSpells: () => void;
  onOpenHunts: () => void;
  onOpenBestiary: () => void;
  onOpenEnchanting?: () => void;
  onOpenMarket?: () => void;
  onOpenParty: () => void;
  onToggleChat: () => void;
  onOpenVocationReset?: () => void;
  onOpenFeedback?: () => void;
  onOpenTutorial?: () => void;
  onOpenSaveBackup?: () => void;
  onCancelTarget?: () => void;
  onOpenDonate?: () => void;
}

const VOCATION_ACRONYMS: Record<string, string> = {
  knight: 'EK',
  paladin: 'RP',
  sorcerer: 'MS',
  druid: 'ED',
};

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  character,
  isConnected,
  isAutoHunting = false,
  waveInfo,
  floorInfo,
  targetEntity,
  isChatOpen = true,
  isLunia25D = true,
  onToggleCamera,
  onToggleAutoHunt,
  onRestAtShrine,
  onDescendFloor,
  onOpenInventory,
  onOpenSkills,
  onOpenSpells,
  onOpenHunts,
  onOpenBestiary,
  onOpenEnchanting,
  onOpenMarket,
  onOpenParty,
  onToggleChat,
  onOpenVocationReset,
  onOpenFeedback,
  onOpenTutorial,
  onOpenSaveBackup,
  onCancelTarget,
  onOpenDonate,
}) => {
  const [muted, setMuted] = React.useState(sounds.isMuted);
  const vocAcronym = VOCATION_ACRONYMS[character.vocation] || 'EK';
  const currentMap = MAPS_DATABASE[character.currentMapId] || MAPS_DATABASE.HUB_THAIS;

  const currentLevelBaseExp = getExperienceForLevel(character.level);
  const nextLevelExp = getExperienceForLevel(character.level + 1);
  const expInLevel = Math.max(0, character.experience - currentLevelBaseExp);
  const expNeeded = Math.max(1, nextLevelExp - currentLevelBaseExp);
  const expPercent = Math.min(100, Math.max(0, Math.floor((expInLevel / expNeeded) * 100)));

  const toggleSound = () => {
    sounds.isMuted = !sounds.isMuted;
    setMuted(sounds.isMuted);
  };

  const hpPercent = Math.min(100, Math.max(0, (character.hp / character.maxHp) * 100));
  const manaPercent = Math.min(100, Math.max(0, (character.mana / character.maxMana) * 100));

  return (
    <>
      {/* 1. MAIN TOP HEADER ROW (Left: Hero Card, Center: Stage/Wave, Right: Quick Actions) */}
      <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none p-2 sm:p-3 flex items-start justify-between gap-2 select-none">
        {/* TOP-LEFT: LuniaZ Hero Character Card & Current Hunt Pill */}
        <div className="pointer-events-auto flex flex-col gap-1.5 shrink-0 max-w-[240px] sm:max-w-[270px]">
          {/* Character Card */}
          <div
            onClick={onOpenSkills}
            title="Clique para ver Atributos & Habilidades (Hotkey: K)"
            className="bg-[#12161c] border-2 border-[#5c4a38] p-2 sm:p-2.5 rounded flex items-center gap-2.5 cursor-pointer hover:border-[#facc15] transition-all shadow-2xl font-mono text-slate-200 group relative overflow-hidden"
          >
            {/* Vocation Avatar Badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-amber-600 to-amber-700 border border-amber-400 rounded flex flex-col items-center justify-center font-black text-stone-950 shadow-md group-hover:scale-105 transition-transform shrink-0 relative">
              <span className="text-xs font-black tracking-wider leading-none">{vocAcronym}</span>
              <span className="text-[7px] text-stone-900 uppercase font-bold tracking-tighter mt-0.5">
                {character.vocation.slice(0, 3)}
              </span>
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-stone-950 text-[8px] font-black px-1 rounded border border-stone-900">
                Lvl.{character.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Player Name & EXP */}
              <div className="flex justify-between items-center text-[11px] mb-1 font-bold">
                <span className="truncate text-[#facc15] tracking-wider uppercase">{character.name}</span>
                <span className="text-slate-400 font-mono text-[9px]">{expPercent}% EXP</span>
              </div>

              {/* Health Bar */}
              <div className="relative h-3.5 w-full overflow-hidden rounded-xs bg-[#0b0e14] border border-[#333d4c] mb-1 shadow-inner">
                <div
                  className={`h-full bg-gradient-to-r ${
                    hpPercent > 60
                      ? 'from-emerald-600 to-green-500'
                      : hpPercent > 30
                      ? 'from-amber-600 to-yellow-500'
                      : 'from-rose-700 to-red-500'
                  } transition-all duration-200`}
                  style={{ width: `${hpPercent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white font-mono drop-shadow">
                  {character.hp} / {character.maxHp}
                </span>
              </div>

              {/* Mana Bar */}
              <div className="relative h-3 w-full overflow-hidden rounded-xs bg-[#0b0e14] border border-[#333d4c] shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-all duration-200"
                  style={{ width: `${manaPercent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white font-mono drop-shadow">
                  {character.mana} / {character.maxMana}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Hunt Zone Mini-Pill */}
          <div
            onClick={onOpenHunts}
            title="Abrir Guia de Caça, Fendas & World Boss (Hotkey: M)"
            className="bg-[#1a1f26] border border-[#3d4857] px-2.5 py-1 rounded flex items-center justify-between cursor-pointer hover:border-[#facc15] transition-colors shadow-md text-xs font-mono text-slate-200"
          >
            <div className="flex items-center gap-1.5 truncate">
              {currentMap.mapType === 'rift' ? (
                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
              ) : currentMap.mapType === 'world_boss' ? (
                <Crown className="w-3 h-3 text-rose-400 shrink-0" />
              ) : (
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              )}
              <span className="truncate text-zinc-300 font-medium text-[11px]">{currentMap.name}</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono shrink-0 ml-1.5 ${
                currentMap.isSafeZone
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                  : currentMap.mapType === 'rift'
                  ? 'text-cyan-300 bg-cyan-950/70 border border-cyan-500/40'
                  : currentMap.mapType === 'world_boss'
                  ? 'text-rose-300 bg-rose-950/70 border border-rose-500/40'
                  : 'text-amber-400 bg-amber-950/60 border border-amber-500/30'
              }`}
            >
              {currentMap.isSafeZone
                ? 'Santuário'
                : currentMap.mapType === 'rift'
                ? `Fenda F${currentMap.riftFloor || 1}`
                : currentMap.mapType === 'world_boss'
                ? 'World Boss'
                : `Lv.${currentMap.recommendedLevel}+`}
            </span>
          </div>
        </div>

        {/* TOP-CENTER: Stage & Wave Progress Monitor (Completely clean and non-overlapping) */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 shrink-0">
          {currentMap.isSafeZone ? (
            /* Safe Sanctuary Rest Shrine */
            onRestAtShrine && (
              <button
                onClick={onRestAtShrine}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 hover:border-emerald-400 text-xs font-semibold text-emerald-300 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
                title="Descansar no altar para restaurar toda a Vida e Mana"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Descansar no Altar</span>
              </button>
            )
          ) : currentMap.mapType === 'open_world' ? (
            /* Open World Hunt Area (Mundo Aberto com Respawn Contínuo) */
            <div className="flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md border border-emerald-500/30 rounded-full px-3.5 py-1 shadow-lg text-xs">
              <span className="font-bold text-emerald-400 border-r border-white/10 pr-2 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Mundo Aberto</span>
              </span>
              <span className="text-zinc-300 text-[11px] font-medium flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-teal-400" />
                <span>Respawn Contínuo</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                Abates: {character.huntMastery?.[character.currentMapId] || 0}
              </span>
            </div>
          ) : (
            /* Procedural Dungeon with Floor and Wave Info */
            <div className="flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md border border-purple-500/30 rounded-full px-3.5 py-1 shadow-lg text-xs">
              {floorInfo && (
                <span className="font-bold text-amber-400 border-r border-white/10 pr-2 font-mono">
                  Andar B{floorInfo.floorNumber}
                </span>
              )}

              {waveInfo && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-semibold text-zinc-300 text-[11px]">
                    <Swords className="w-3 h-3 text-orange-400" />
                    <span>Onda {waveInfo.currentWave}</span>
                  </div>
                  <div className="w-16 sm:w-20 h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
                      style={{ width: `${Math.min(100, (waveInfo.waveKills / waveInfo.waveTarget) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-medium">
                    {waveInfo.waveKills}/{waveInfo.waveTarget}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Boss Awakening Alert Banner (Dungeons) */}
          {waveInfo?.bossAlive && !currentMap.isSafeZone && (
            <div className="bg-red-950/90 border border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] backdrop-blur-md px-3.5 py-1 rounded-full flex items-center gap-2 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-black tracking-wider text-red-100 uppercase">
                BOSS DA ONDA {waveInfo.currentWave} DESPERTO!
              </span>
            </div>
          )}

          {/* Descent Portal Button (Dungeons) */}
          {floorInfo?.portalOpen && onDescendFloor && (
            <button
              onClick={onDescendFloor}
              className="animate-bounce flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-600 text-white font-black text-xs tracking-wide shadow-lg shadow-cyan-500/30 border border-cyan-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>PORTAL ABERTO &bull; DESCER PARA B{floorInfo.floorNumber + 1}</span>
            </button>
          )}
        </div>

        {/* TOP-RIGHT: Controls, Gold, Camera Toggle, Party & Toolbars */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Isometric / Frontal ARPG Camera Toggle Button */}
            {onToggleCamera && (
              <button
                onClick={onToggleCamera}
                className={`backdrop-blur-md border px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-lg text-xs font-bold ${
                  isLunia25D
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-zinc-950/80 border-white/10 text-zinc-300 hover:text-white'
                }`}
                title="Alternar entre Câmera Isométrica e Frontal (Hotkey: V | Use o scroll do mouse para Zoom)"
              >
                <Camera className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider hidden sm:inline">
                  {isLunia25D ? 'Isométrica' : 'Frontal'}
                </span>
              </button>
            )}

            {/* Party / Grupo Modal Trigger */}
            <button
              onClick={onOpenParty}
              className="bg-zinc-950/80 hover:bg-emerald-950/60 backdrop-blur-md border border-emerald-500/40 hover:border-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg text-xs font-bold text-emerald-300 cursor-pointer transition-all hover:scale-105"
              title="Gerenciar Grupo & Multiplayer Co-op (Hotkey: P)"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Grupo</span>
            </button>

            {/* Donate / Support Server Button */}
            {onOpenDonate && (
              <button
                onClick={onOpenDonate}
                className="bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-md border border-amber-500/60 hover:border-amber-400 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] text-xs font-bold text-amber-300 cursor-pointer transition-all hover:scale-105 animate-pulse"
                title="Apoie o Servidor de Testes & Hospedagem Paga"
              >
                <Heart className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[10px] uppercase tracking-wider">Apoiar</span>
              </button>
            )}

            {/* Gold Counter Pill */}
            <div className="bg-[#12161c] border-2 border-[#5c4a38] px-2.5 py-1 rounded flex items-center gap-1.5 shadow-xl font-mono">
              <Coins className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
              <span className="text-xs text-[#facc15] font-bold">
                {character.gold.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Consolidated Glass Action Toolbar for Windows */}
          <div className="bg-[#12161c] border-2 border-[#5c4a38] p-1 rounded flex items-center gap-1 shadow-2xl font-mono">
            {/* Inventory */}
            <button
              onClick={onOpenInventory}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Equipamentos & Mochila (Hotkey: I)"
            >
              <Backpack className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Skills */}
            <button
              onClick={onOpenSkills}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Atributos & Habilidades (Hotkey: K)"
            >
              <Scroll className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {/* Spells */}
            <button
              onClick={onOpenSpells}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Grimório de Magias (Hotkey: S)"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            </button>

            {/* Hunts */}
            <button
              onClick={onOpenHunts}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Zonas de Caça & Mapas (Hotkey: M)"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            {/* Bestiary */}
            <button
              onClick={onOpenBestiary}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Bestiário & Maestria de Criaturas (Hotkey: B)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
            </button>

            {/* Enchanting Altar */}
            {onOpenEnchanting && (
              <button
                onClick={onOpenEnchanting}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Altar de Encantamentos Rúnicos (Hotkey: E)"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              </button>
            )}

            {/* Marketplace */}
            {onOpenMarket && (
              <button
                onClick={onOpenMarket}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Mercado & Leilões de Thais"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {/* Chat Toggle */}
            <button
              onClick={onToggleChat}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isChatOpen ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Abrir/Fechar Janela de Chat (Hotkey: C)"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            </button>

            {/* Tutorial / Guia do Testador */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                title="Guia do Testador & Controles (Hotkey: H)"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {/* Cloud Save & Backup */}
            {onOpenSaveBackup && (
              <button
                onClick={onOpenSaveBackup}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Gerenciador de Save & Nuvem"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {/* Feedback / Reportar Bug */}
            {onOpenFeedback && (
              <button
                onClick={onOpenFeedback}
                className="p-1.5 rounded-full hover:bg-red-950/60 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
                title="Reportar Bug / Feedback do Teste Privado"
              >
                <Bug className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}

            {/* Vocation Reset */}
            {onOpenVocationReset && (
              <button
                onClick={onOpenVocationReset}
                className="p-1.5 rounded-full hover:bg-white/10 text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                title="Trocar Vocação / Resetar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={muted ? 'Desmutar Áudio' : 'Mutar Áudio'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-zinc-600" /> : <Volume2 className="w-3.5 h-3.5 text-orange-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. DEDICATED FLOATING TARGET MONSTER HEALTH FRAME (Centered below top header row, NEVER colliding) */}
      {targetEntity && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150">
          <div className="pointer-events-auto bg-zinc-950/95 backdrop-blur-md border border-red-500/50 rounded-xl px-4 py-1.5 shadow-2xl flex flex-col items-center min-w-[220px] max-w-sm">
            <div className="flex items-center justify-between w-full gap-3 text-[11px] font-bold text-red-100">
              <div className="flex items-center gap-1.5 truncate">
                <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">{targetEntity.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-red-300/80 shrink-0">
                  {targetEntity.hp} / {targetEntity.maxHp}
                </span>
                {onCancelTarget && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelTarget();
                    }}
                    className="p-0.5 -mr-1 text-zinc-400 hover:text-red-300 hover:bg-red-950/60 rounded transition-colors"
                    title="Desmarcar alvo (ESC ou clique no mapa)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-red-950 mt-1">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-150 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                style={{
                  width: `${Math.min(100, Math.max(0, (targetEntity.hp / targetEntity.maxHp) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
