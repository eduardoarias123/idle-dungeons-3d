import React, { useState } from 'react';
import { CharacterData, MapTypeCategory, MapHuntDef } from '../../types/game';
import { MAPS_DATABASE } from '../../constants/maps';
import { HUNT_MASTERY_TIERS, getMapMasteryProgress, calculateTotalMasteryBonuses } from '../../constants/mastery';
import {
  X,
  MapPin,
  Skull,
  Crown,
  Sparkles,
  Trophy,
  Award,
  ChevronRight,
  CheckCircle2,
  Shield,
  Heart,
  Zap,
  Swords,
  Compass,
  Layers,
  RotateCcw,
  Flame,
  Home,
  Timer,
  Crosshair,
  AlertTriangle,
  Gift,
  Gauge,
  Eye,
} from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface HuntsModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onSwitchMap: (mapId: string, difficulty?: 'easy' | 'medium' | 'hard') => void;
}

type TabType = 'open_world' | 'dungeon' | 'rift' | 'world_boss';

export const HuntsModal: React.FC<HuntsModalProps> = ({
  character,
  isOpen,
  onClose,
  onSwitchMap,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('open_world');
  const [mapDifficulties, setMapDifficulties] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  if (!isOpen) return null;

  const allMaps = Object.values(MAPS_DATABASE);
  const huntMastery = character.huntMastery || {};
  const totalBonuses = calculateTotalMasteryBonuses(huntMastery);

  // Filter maps based on active tab
  const displayedMaps = allMaps.filter((m) => {
    if (m.isSafeZone) return false;
    return m.mapType === activeTab;
  });

  const sanctuaryMap = allMaps.find((m) => m.isSafeZone);

  // Counts for each tab badge
  const countOpenWorld = allMaps.filter((m) => !m.isSafeZone && m.mapType === 'open_world').length;
  const countDungeon = allMaps.filter((m) => !m.isSafeZone && m.mapType === 'dungeon').length;
  const countRift = allMaps.filter((m) => !m.isSafeZone && m.mapType === 'rift').length;
  const countWorldBoss = allMaps.filter((m) => !m.isSafeZone && m.mapType === 'world_boss').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-amber-400" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
                GUIA DE CAÇA, FENDAS & EXPEDIÇÕES
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Fechar Janela"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Mode Switcher Tabs (4 Tabs) */}
        <div className="px-3 py-2 bg-[#1a1f26] border-b border-[#3d4857] flex flex-col lg:flex-row items-center justify-between gap-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-[#0e1218] rounded border border-[#3d4857] w-full lg:w-auto">
            {/* Tab 1: Hunts Comuns */}
            <button
              onClick={() => {
                setActiveTab('open_world');
                sounds.playSwordSwing();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'open_world'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">Hunts Comuns</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-emerald-300 font-mono">
                {countOpenWorld}
              </span>
            </button>

            {/* Tab 2: Dungeons Procedurais */}
            <button
              onClick={() => {
                setActiveTab('dungeon');
                sounds.playSwordSwing();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dungeon'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="truncate">Dungeons</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-purple-300 font-mono">
                {countDungeon}
              </span>
            </button>

            {/* Tab 3: Rift Tower */}
            <button
              onClick={() => {
                setActiveTab('rift');
                sounds.playSwordSwing();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rift'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950 ring-1 ring-cyan-400/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="truncate">Rift Tower</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-cyan-300 font-mono">
                {countRift}
              </span>
            </button>

            {/* Tab 4: World Boss */}
            <button
              onClick={() => {
                setActiveTab('world_boss');
                sounds.playSwordSwing();
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'world_boss'
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white shadow-md shadow-rose-950 ring-1 ring-rose-400/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span className="truncate">World Boss</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-rose-300 font-mono">
                {countWorldBoss}
              </span>
            </button>
          </div>

          {/* Quick Return to Sanctuary Button */}
          {sanctuaryMap && (
            <button
              onClick={() => {
                onSwitchMap(sanctuaryMap.id);
                onClose();
                sounds.playSwordSwing();
              }}
              disabled={character.currentMapId === sanctuaryMap.id}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer w-full lg:w-auto ${
                character.currentMapId === sanctuaryMap.id
                  ? 'bg-zinc-800/40 border-white/5 text-zinc-500 cursor-default'
                  : 'bg-emerald-950/50 border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:bg-emerald-950/80 shadow-md'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{character.currentMapId === sanctuaryMap.id ? 'Você está em Thais' : 'Retornar ao Santuário'}</span>
            </button>
          )}
        </div>

        {/* Informational Mechanics Explainer Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-white/10 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          {activeTab === 'open_world' && (
            <div className="flex items-center gap-2 text-emerald-300">
              <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Mundo Aberto:</strong> Layouts dinâmicos com <strong>respawn contínuo de monstros</strong> para farm livre e progressão de Maestria de Zona.
              </span>
            </div>
          )}

          {activeTab === 'dungeon' && (
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Dungeons Procedurais (Rogue-like):</strong> Layouts aleatórios gerados a cada descida, modificadores mágicos, baús e <strong>Chefe com Portais para B2, B3...</strong>
              </span>
            </div>
          )}

          {activeTab === 'rift' && (
            <div className="flex items-center gap-2 text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Rift Tower (Fenda do Caos):</strong> Hordas densas de monstros, combate acelerado em 360°, timer de 5 min e <strong>Guardião com Gemas Lendárias</strong>.
              </span>
            </div>
          )}

          {activeTab === 'world_boss' && (
            <div className="flex items-center gap-2 text-rose-300">
              <Flame className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>World Boss (Incursões Épicas):</strong> Batalhas colossais com <strong>ataques telegrafados no chão</strong> (círculos e cones de perigo) e loot mítico.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 font-mono font-bold text-[11px] text-amber-300 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalBonuses.totalTiersUnlocked} Maestrias Ativas</span>
          </div>
        </div>

        {/* Map Cards List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-3.5 flex-1">
          {displayedMaps.map((map) => {
            const isCurrent = character.currentMapId === map.id;
            const isUnderlevel = character.level < map.recommendedLevel;
            const kills = huntMastery[map.id] || 0;
            const mastery = getMapMasteryProgress(kills);

            return (
              <div
                key={map.id}
                className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                  isCurrent
                    ? activeTab === 'open_world'
                      ? 'bg-emerald-950/20 border-emerald-500/80 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                      : activeTab === 'dungeon'
                      ? 'bg-purple-950/20 border-purple-500/80 shadow-[0_0_16px_rgba(168,85,247,0.18)]'
                      : activeTab === 'rift'
                      ? 'bg-cyan-950/25 border-cyan-500/80 shadow-[0_0_18px_rgba(6,182,212,0.22)]'
                      : 'bg-rose-950/25 border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.22)]'
                    : 'bg-zinc-900/60 border-white/10 hover:border-amber-500/40 hover:bg-zinc-900/90'
                }`}
              >
                {/* Top Row: Map Info + Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`p-1.5 rounded-lg ${
                        activeTab === 'open_world'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : activeTab === 'dungeon'
                          ? 'bg-purple-500/20 text-purple-400'
                          : activeTab === 'rift'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {activeTab === 'open_world' && <MapPin className="w-4 h-4" />}
                        {activeTab === 'dungeon' && <Layers className="w-4 h-4" />}
                        {activeTab === 'rift' && <Zap className="w-4 h-4" />}
                        {activeTab === 'world_boss' && <Crown className="w-4 h-4" />}
                      </div>

                      <h3 className="text-sm font-bold text-gray-100">{map.name}</h3>

                      {/* Map Type Tag */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wide flex items-center gap-1 ${
                        map.mapType === 'open_world'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : map.mapType === 'dungeon'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                          : map.mapType === 'rift'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                      }`}>
                        {map.mapType === 'open_world' && '🗺️ Mundo Aberto'}
                        {map.mapType === 'dungeon' && '🌀 Dungeon Procedural'}
                        {map.mapType === 'rift' && '⚡ Fenda Maior'}
                        {map.mapType === 'world_boss' && '🐉 Incursão de World Boss'}
                      </span>

                      {/* Level Recommendation */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                        isUnderlevel
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {isUnderlevel ? `⚠️ Desafiadora (Rec. Lv ${map.recommendedLevel}+)` : `Nível: Lv ${map.recommendedLevel}+`}
                      </span>

                      {/* Mastery Tier Pill (For open world) */}
                      {map.mapType === 'open_world' && mastery.completedTier > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5" /> Tier {mastery.completedTier} Master
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">{map.description}</p>
                    
                    {/* Rift Tower Special Details */}
                    {map.mapType === 'rift' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                          <Timer className="w-3 h-3" />
                          <span>Tempo Limite: 5 Minutos</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                          <Gift className="w-3 h-3" />
                          <span>Recompensas: {map.specialRewards?.join(', ') || 'Gemas & Encantamentos'}</span>
                        </div>
                      </div>
                    )}

                    {/* World Boss Special Mechanics & Weakness */}
                    {map.mapType === 'world_boss' && (
                      <div className="flex flex-col gap-1.5 pt-1.5 bg-black/30 rounded-lg p-2.5 border border-rose-950/60">
                        {map.elementalWeakness && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Fraqueza Elemental: <span className="text-white font-normal">{map.elementalWeakness}</span></span>
                          </div>
                        )}
                        {map.bossMechanics && (
                          <div className="flex flex-col gap-0.5 text-[10px] text-zinc-300">
                            <span className="font-bold text-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Mecânicas Telegrafadas da Arena:
                            </span>
                            <ul className="list-disc list-inside pl-1 text-zinc-400 space-y-0.5">
                              {map.bossMechanics.map((mech, idx) => (
                                <li key={idx}><span className="text-zinc-200">{mech}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {map.specialRewards && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 pt-0.5">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Loot Mítico: <span className="text-emerald-300 font-mono">{map.specialRewards.join(' • ')}</span></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Difficulty Selector for Open World Hunts */}
                    {map.mapType === 'open_world' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-zinc-400">Dificuldade:</span>
                        {(['easy', 'medium', 'hard'] as const).map((diff) => {
                          const isSel = (mapDifficulties[map.id] || 'medium') === diff;
                          return (
                            <button
                              key={diff}
                              onClick={() => {
                                setMapDifficulties(prev => ({ ...prev, [map.id]: diff }));
                                sounds.playSwordSwing();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                                isSel
                                  ? diff === 'easy'
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950'
                                    : diff === 'medium'
                                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950'
                                    : 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-950'
                                  : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              {diff === 'easy' ? '🟢 Fácil (1-3)' : diff === 'medium' ? '🟡 Médio (3-5)' : '🔴 Difícil (5-8 Box)'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Button */}
                  <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                    {isCurrent ? (
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider block text-center shadow-md border ${
                        activeTab === 'open_world'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                          : activeTab === 'dungeon'
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-400'
                          : activeTab === 'rift'
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400'
                          : 'bg-rose-500/15 border-rose-500/50 text-rose-400'
                      }`}>
                        ✓ Zona Atual
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const diff = mapDifficulties[map.id] || 'medium';
                          onSwitchMap(map.id, diff);
                          onClose();
                          sounds.playSwordSwing();
                        }}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg text-white hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                          activeTab === 'open_world'
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/60'
                            : activeTab === 'dungeon'
                            ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-purple-950/60'
                            : activeTab === 'rift'
                            ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950/60'
                            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-700 hover:from-rose-500 hover:to-red-500 shadow-rose-950/60'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>
                          {activeTab === 'open_world' && 'Iniciar Caça Aberta'}
                          {activeTab === 'dungeon' && 'Entrar na Masmorra'}
                          {activeTab === 'rift' && `Abrir Fenda (Andar ${map.riftFloor || 1})`}
                          {activeTab === 'world_boss' && 'Desafiar World Boss'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mastery Progress Bar (Shown for open_world and dungeons) */}
                {map.mapType === 'open_world' && (
                  <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-gray-200">Maestria de Zona:</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {mastery.isMaxTier ? 'MAXED (Apex Conqueror)' : `Tier ${mastery.completedTier + 1}: ${mastery.nextTierMilestone.name}`}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-gray-400 font-bold">
                        {kills} / {mastery.targetKills} Kills ({mastery.progressPercent}%)
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-white/10 relative">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        style={{ width: `${mastery.progressPercent}%` }}
                      />
                    </div>

                    {/* Milestones Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {HUNT_MASTERY_TIERS.map((milestone) => {
                        const isClaimed = kills >= milestone.killsRequired;
                        return (
                          <div
                            key={milestone.tier}
                            className={`p-2 rounded-lg border text-[10px] flex flex-col gap-0.5 transition-all ${
                              isClaimed
                                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                                : 'bg-black/30 border-white/5 text-gray-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold font-sans">
                                T{milestone.tier} ({milestone.killsRequired}k)
                              </span>
                              {isClaimed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="text-[9px] font-mono">{kills}/{milestone.killsRequired}</span>
                              )}
                            </div>
                            <span className={isClaimed ? 'text-emerald-300 font-bold' : 'text-gray-400'}>
                              {milestone.bonusDescription}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
