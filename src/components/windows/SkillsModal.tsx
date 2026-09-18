import React from 'react';
import { CharacterData } from '../../types/game';
import { VOCATIONS, getExperienceForLevel } from '../../constants/vocations';
import { X, Scroll, Swords, Shield, Wand2, Target, Crosshair, Sparkles, Trophy, RotateCcw } from 'lucide-react';

interface SkillsModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onOpenVocationReset?: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({ character, isOpen, onClose, onOpenVocationReset }) => {
  if (!isOpen) return null;

  const voc = VOCATIONS[character.vocation];
  const currentBase = getExperienceForLevel(character.level);
  const nextExp = getExperienceForLevel(character.level + 1);
  const expNeeded = Math.max(1, nextExp - currentBase);
  const expCurrent = Math.max(0, character.experience - currentBase);
  const expPercent = Math.min(100, Math.floor((expCurrent / expNeeded) * 100));

  const skillsList = [
    { name: 'Magic Level', value: character.skills.magic, tries: character.skills.manaSpent, icon: Wand2, color: 'text-purple-400', barCol: 'bg-purple-500' },
    { name: 'Sword Fighting', value: character.skills.sword, tries: character.skills.swordTries, icon: Swords, color: 'text-rose-400', barCol: 'bg-rose-500' },
    { name: 'Axe Fighting', value: character.skills.axe, tries: character.skills.axeTries, icon: Swords, color: 'text-orange-400', barCol: 'bg-orange-500' },
    { name: 'Club Fighting', value: character.skills.club, tries: character.skills.clubTries, icon: Swords, color: 'text-amber-400', barCol: 'bg-amber-500' },
    { name: 'Distance Fighting', value: character.skills.distance, tries: character.skills.distanceTries, icon: Target, color: 'text-emerald-400', barCol: 'bg-emerald-500' },
    { name: 'Shielding', value: character.skills.shielding, tries: character.skills.shieldingTries, icon: Shield, color: 'text-sky-400', barCol: 'bg-sky-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Scroll className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
              SKILLS & ATTRIBUTES
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

        <div className="p-4 space-y-4">
          {/* General Stats Card */}
          <div className="p-3 rounded border border-[#3d4857] bg-[#1a1f26] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-100">{character.name}</h3>
                <span className="text-xs uppercase tracking-wider font-semibold text-orange-400">
                  {voc.name} • Level {character.level}
                </span>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="text-gray-500">Experience</div>
                <div className="text-orange-400 font-bold">{character.experience.toLocaleString()}</div>
              </div>
            </div>

            {/* Exp Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>Progress to Level {character.level + 1}</span>
                <span>{expPercent}% ({expCurrent.toLocaleString()} / {expNeeded.toLocaleString()})</span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] transition-all duration-300"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>

            {/* Vitals Summary Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center font-mono text-xs">
              <div className="bg-black/60 p-2 rounded border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Hit Points</div>
                <div className="text-green-400 font-bold">{character.hp} / {character.maxHp}</div>
              </div>
              <div className="bg-black/60 p-2 rounded border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Mana</div>
                <div className="text-blue-400 font-bold">{character.mana} / {character.maxMana}</div>
              </div>
              <div className="bg-black/60 p-2 rounded border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Capacity</div>
                <div className="text-gray-200 font-bold">{character.capacity} oz</div>
              </div>
            </div>
          </div>

          {/* Tibia Skills List */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Combat Skills & Magic
            </h4>

            <div className="flex flex-col gap-2">
              {skillsList.map((skill) => {
                const Icon = skill.icon;
                const percent = Math.min(100, Math.max(0, Math.floor(skill.tries % 100)));

                return (
                  <div
                    key={skill.name}
                    className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${skill.color}`} />
                        <span className="text-xs font-bold text-gray-200">{skill.name}</span>
                      </div>
                      <div className="text-sm font-extrabold text-orange-400 font-mono">
                        {skill.value}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${skill.barCol} transition-all duration-300`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 w-8 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hall of Fame / Slayer Records */}
          <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-orange-400">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">Total Kills:</span>
            </div>
            <div className="text-gray-200 font-bold">
              {(character.killsCount || 0).toLocaleString()} monsters slain
            </div>
          </div>

          {/* Change Vocation / Reset Button */}
          {onOpenVocationReset && (
            <button
              onClick={() => {
                onClose();
                onOpenVocationReset();
              }}
              className="w-full py-2.5 bg-orange-950/40 hover:bg-orange-600/30 border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span>Trocar Vocação / Resetar Personagem</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
