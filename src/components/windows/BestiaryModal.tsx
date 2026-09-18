import React, { useState } from 'react';
import { CharacterData } from '../../types/game';
import { BESTIARY_DATABASE, getMonsterBestiaryTier, getMonsterBestiaryBonuses } from '../../constants/bestiary';
import { BookOpen, Skull, Flame, ShieldAlert, Sparkles, X, Award, CheckCircle2, Crosshair, HelpCircle } from 'lucide-react';

interface BestiaryModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
}

export const BestiaryModal: React.FC<BestiaryModalProps> = ({ character, isOpen, onClose }) => {
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('rotworm');
  const [filterFamily, setFilterFamily] = useState<string>('ALL');

  if (!isOpen) return null;

  const monstersList = Object.values(BESTIARY_DATABASE);
  const filteredMonsters = filterFamily === 'ALL' 
    ? monstersList 
    : monstersList.filter(m => m.family === filterFamily);

  const selectedMonster = BESTIARY_DATABASE[selectedMonsterId] || monstersList[0];
  const kills = character.bestiaryKills?.[selectedMonster.id] || 0;
  const currentTier = getMonsterBestiaryTier(selectedMonster.id, kills);
  const bonuses = getMonsterBestiaryBonuses(selectedMonster.id, kills);

  // Next tier progress
  let nextTarget = selectedMonster.tierRequirements.tier1;
  let prevTarget = 0;
  if (currentTier === 1) {
    prevTarget = selectedMonster.tierRequirements.tier1;
    nextTarget = selectedMonster.tierRequirements.tier2;
  } else if (currentTier === 2) {
    prevTarget = selectedMonster.tierRequirements.tier2;
    nextTarget = selectedMonster.tierRequirements.tier3;
  } else if (currentTier === 3) {
    prevTarget = selectedMonster.tierRequirements.tier3;
    nextTarget = selectedMonster.tierRequirements.tier3;
  }

  const progressPct = currentTier === 3 
    ? 100 
    : Math.min(100, Math.max(0, ((kills - prevTarget) / (nextTarget - prevTarget)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
              GRIMÓRIO DO CAÇADOR & BESTIÁRIO
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Fechar Janela"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80 overflow-x-auto text-xs">
          {['ALL', 'Boss', 'Rodent', 'Worm', 'Undead', 'Giant'].map((fam) => (
            <button
              key={fam}
              onClick={() => setFilterFamily(fam)}
              className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                filterFamily === fam
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {fam === 'ALL' ? 'Todos os Monstros' : fam === 'Boss' ? '💀 Chefes' : fam}
            </button>
          ))}
        </div>

        {/* Content Body: Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Monster Directory */}
          <div className="md:col-span-5 border-r border-zinc-800/80 p-3 overflow-y-auto max-h-[60vh] md:max-h-full space-y-1.5">
            {filteredMonsters.map((mob) => {
              const mobKills = character.bestiaryKills?.[mob.id] || 0;
              const tier = getMonsterBestiaryTier(mob.id, mobKills);
              const isSelected = selectedMonsterId === mob.id;

              return (
                <div
                  key={mob.id}
                  onClick={() => setSelectedMonsterId(mob.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[inset_0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner"
                      style={{
                        backgroundColor: `${mob.color}25`,
                        border: `1px solid ${mob.color}60`,
                        color: mob.color,
                      }}
                    >
                      {mob.family === 'Boss' ? '💀' : mob.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <span>{mob.name}</span>
                        {mob.family === 'Boss' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-red-950/80 text-red-400 font-bold border border-red-500/30">
                            BOSS
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {mobKills} abates
                      </div>
                    </div>
                  </div>

                  {/* Tier Badge */}
                  <div className="flex items-center gap-1">
                    {tier === 3 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        Mestre
                      </span>
                    ) : tier === 2 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40">
                        Tier 2
                      </span>
                    ) : tier === 1 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                        Tier 1
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Monster Grimoire Folio */}
          <div className="md:col-span-7 p-6 overflow-y-auto max-h-[60vh] md:max-h-full flex flex-col justify-between space-y-6">
            <div>
              {/* Creature Title & Location */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {selectedMonster.family}
                    </span>
                    <span className="text-xs text-amber-400 font-medium">
                      📍 {selectedMonster.huntMapName}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-100 font-mono tracking-wide">
                    {selectedMonster.name}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Abates</div>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    {kills}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
                {selectedMonster.description}
              </p>

              {/* Weakness & Combat Notes */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Fraquezas Elementais
                  </div>
                  <div className="text-xs font-bold text-orange-200">
                    {currentTier >= 1 ? selectedMonster.weakness : '??? (Requer Tier 1)'}
                  </div>
                </div>

                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Bônus Ativo de Maestria
                  </div>
                  <div className="text-xs font-bold text-amber-300">
                    {bonuses.damageBonusPct > 0 ? (
                      `+${bonuses.damageBonusPct}% Dano${bonuses.critBonusPct > 0 ? ` | +${bonuses.critBonusPct}% Crítico` : ''}`
                    ) : (
                      'Nenhum bônus ativo'
                    )}
                  </div>
                </div>
              </div>

              {/* Mastery Tier Progress Bar */}
              <div className="mt-5 bg-zinc-900/80 p-4 rounded-xl border border-amber-500/20">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <span className="text-amber-200 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    {currentTier === 3 ? 'Maestria Plena Alcançada' : `Progresso para o Próximo Nível`}
                  </span>
                  <span className="font-mono text-zinc-400">
                    {currentTier === 3 ? `${kills} abates` : `${kills} / ${nextTarget} abates`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Tier Breakdown Cards */}
              <div className="mt-4 space-y-2">
                {/* Tier 1 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                  currentTier >= 1 
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                    : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-500'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentTier >= 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-zinc-600" />
                    )}
                    <div>
                      <span className="font-bold">Tier 1 ({selectedMonster.tierRequirements.tier1} abates):</span>{' '}
                      <span>Revela fraquezas e concede +3% de dano contra a espécie.</span>
                    </div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                  currentTier >= 2 
                    ? 'bg-sky-950/20 border-sky-500/40 text-sky-200' 
                    : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-500'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentTier >= 2 ? (
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-zinc-600" />
                    )}
                    <div>
                      <span className="font-bold">Tier 2 ({selectedMonster.tierRequirements.tier2} abates):</span>{' '}
                      <span>Aumenta a chance de loot raro em +3% ao derrotar este monstro.</span>
                    </div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                  currentTier >= 3 
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 shadow-sm' 
                    : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-500'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentTier >= 3 ? (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-zinc-600" />
                    )}
                    <div>
                      <span className="font-bold">Tier 3 - Mestre ({selectedMonster.tierRequirements.tier3} abates):</span>{' '}
                      <span>Maestria plena: +10% de dano total e +4% de chance de crítico.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Os bônus de maestria acumulam automaticamente em todas as caçadas.</span>
              <span className="text-amber-400 font-semibold font-mono">
                {Object.keys(character.bestiaryKills || {}).length} espécies registradas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
