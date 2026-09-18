import React from 'react';
import { CharacterData } from '../../types/game';
import { SPELLS_DATABASE } from '../../constants/spells';
import { X, BookOpen, Sparkles, Zap, Flame, Crosshair, Lock, Play } from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface SpellsModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onCastSpell: (spellId: string) => void;
}

export const SpellsModal: React.FC<SpellsModalProps> = ({
  character,
  isOpen,
  onClose,
  onCastSpell,
}) => {
  if (!isOpen) return null;

  // Filter spells for this character's vocation
  const classSpells = Object.values(SPELLS_DATABASE).filter((s) =>
    s.vocation.includes(character.vocation)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
              VOCATION SPELLBOOK
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

        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          <p className="text-xs text-gray-400">
            Ancient magical words known to the {character.vocation}. Cast them using your mana in battle or through your action hotkeys.
          </p>

          <div className="flex flex-col gap-2">
            {classSpells.map((spell) => {
              const isLearned = character.unlockedSpells.includes(spell.id);
              const isRune = spell.isRune;
              const runeCharges = isRune ? (character.runeCharges?.[spell.id] || 0) : null;
              const canCast = isLearned && (isRune ? (runeCharges !== null && runeCharges > 0) : (character.mana >= spell.manaCost));

              return (
                <div
                  key={spell.id}
                  className={`border rounded-lg p-3 flex items-center justify-between transition-all ${
                    isLearned
                      ? isRune
                        ? 'bg-purple-950/20 border-purple-500/20 hover:border-purple-500/50'
                        : 'bg-black/40 border-white/10 hover:border-orange-500/40'
                      : 'bg-black/20 border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-black border border-white/10 mt-0.5">
                      {spell.isHeal ? (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      ) : isRune ? (
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      ) : spell.element === 'energy' ? (
                        <Zap className="w-4 h-4 text-sky-400" />
                      ) : spell.element === 'holy' ? (
                        <Crosshair className="w-4 h-4 text-yellow-300" />
                      ) : (
                        <Flame className="w-4 h-4 text-rose-400" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-200">{spell.name}</span>
                        {isRune && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 uppercase">
                            Runa
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-orange-400">
                          "{spell.words}"
                        </span>
                      </div>

                      <span className="text-xs text-gray-400 mt-0.5">{spell.description}</span>

                      <div className="flex items-center gap-2.5 text-[11px] font-mono text-gray-500 mt-1.5">
                        {isRune ? (
                          <span className="text-purple-400 font-bold">Cargas: {runeCharges}x</span>
                        ) : (
                          <span className="text-blue-400 font-bold">{spell.manaCost} Mana</span>
                        )}
                        <span>•</span>
                        <span>CD: {spell.cooldownMs / 1000}s</span>
                        <span>•</span>
                        <span>Req: Lv {spell.minLevel} (ML {spell.minMagicLevel})</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isLearned ? (
                      <button
                        onClick={() => {
                          onCastSpell(spell.id);
                          sounds.playSpellCast(spell.element);
                        }}
                        disabled={!canCast}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                          canCast
                            ? isRune
                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow'
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>{isRune ? 'Usar Runa' : 'Cast'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-600 text-xs font-mono">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
