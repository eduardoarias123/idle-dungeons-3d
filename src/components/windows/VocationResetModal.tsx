import React, { useState } from 'react';
import { VocationType, CharacterData } from '../../types/game';
import { VOCATIONS } from '../../constants/vocations';
import { Target, Wand2, Sparkles, Swords, X, RotateCcw, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface VocationResetModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onChangeVocation: (vocation: VocationType) => void;
  onResetCharacter: (name: string, vocation: VocationType) => void;
}

export const VocationResetModal: React.FC<VocationResetModalProps> = ({
  character,
  isOpen,
  onClose,
  onChangeVocation,
  onResetCharacter,
}) => {
  const [selectedVocation, setSelectedVocation] = useState<VocationType>(character.vocation);
  const [resetName, setResetName] = useState(character.name);
  const [activeTab, setActiveTab] = useState<'switch' | 'full_reset'>('switch');

  if (!isOpen) return null;

  const vocationList: { type: VocationType; icon: any; color: string; role: string; desc: string }[] = [
    {
      type: 'KNIGHT',
      icon: Swords,
      color: 'text-amber-400',
      role: 'Tank & Melee Bruiser',
      desc: 'Escudo pesado, armadura de aço e maior vida máxima (HP).',
    },
    {
      type: 'PALADIN',
      icon: Target,
      color: 'text-emerald-400',
      role: 'Distance Ranger',
      desc: 'Arco longo, flechas e equilíbrio entre dano físico e cura sagrada.',
    },
    {
      type: 'SORCERER',
      icon: Wand2,
      color: 'text-purple-400',
      role: 'Destruction Archmage',
      desc: 'Cajado astral, alto poder de fogo elemental e grande mana.',
    },
    {
      type: 'DRUID',
      icon: Sparkles,
      color: 'text-sky-400',
      role: 'Sylvan Healer & Ice Shaman',
      desc: 'Chifres da floresta, cajado da vida e poderosas magias curativas.',
    },
  ];

  const currentVoc = VOCATIONS[selectedVocation];

  const handleSwitch = () => {
    sounds.playLevelUp();
    onChangeVocation(selectedVocation);
    onClose();
  };

  const handleFullReset = () => {
    sounds.playLevelUp();
    onResetCharacter(resetName.trim() || character.name, selectedVocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#12141a] border border-white/10 rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-black/60 px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                Trocar Vocação / Reset
              </h2>
              <span className="text-[10px] text-gray-400 font-mono">
                Personagem Atual: <strong className="text-orange-400">{character.name}</strong> (Lv {character.level} {VOCATIONS[character.vocation].name})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-2 bg-black/40 gap-1.5 border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('switch')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'switch'
                ? 'bg-orange-600 text-white shadow-[0_0_12px_rgba(234,88,12,0.3)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mudar Vocação (Manter Nível)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('full_reset')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'full_reset'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Reset Total (Novo Lv 1)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[75vh]">
          {activeTab === 'switch' ? (
            <div className="text-[11px] text-gray-300 bg-blue-950/30 border border-blue-500/20 p-2.5 rounded-lg leading-relaxed">
              💡 <strong>Troca Instantânea:</strong> Seu modelo 3D, HP/Mana máximos, magias básicas e equipamentos serão adaptados imediatamente para a nova vocação, <strong>preservando seu nível {character.level}, experiência e itens</strong>!
            </div>
          ) : (
            <div className="text-[11px] text-gray-300 bg-red-950/30 border border-red-500/20 p-2.5 rounded-lg leading-relaxed">
              ⚠️ <strong>Novo Personagem:</strong> Reinicia seu personagem de volta ao Nível 1 com o equipamento inicial no Templo sagrado de Thais.
            </div>
          )}

          {/* Vocation Grid */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Escolha a Vocação Desejada:
            </label>

            <div className="grid grid-cols-2 gap-2">
              {vocationList.map((v) => {
                const Icon = v.icon;
                const isSelected = selectedVocation === v.type;
                const isCurrent = character.vocation === v.type;

                return (
                  <button
                    key={v.type}
                    type="button"
                    onClick={() => {
                      setSelectedVocation(v.type);
                      sounds.playSwordSwing();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)] scale-[1.02]'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-black/70 border border-white/10 ${v.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-gray-100 block">
                            {VOCATIONS[v.type].name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] text-emerald-400 font-mono">(Atual)</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-orange-400/90">{v.role}</span>
                    <p className="text-[9px] text-gray-400 leading-snug">
                      {v.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vocation Stats Preview */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Atributos de Crescimento por Nível:
            </span>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-gray-500 text-[9px] block">VIDA (HP)</span>
                <span className="text-emerald-400 font-bold text-xs">+{currentVoc.hpPerLevel} / nv</span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-gray-500 text-[9px] block">MANA (MP)</span>
                <span className="text-sky-400 font-bold text-xs">+{currentVoc.manaPerLevel} / nv</span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-gray-500 text-[9px] block">CAPACIDADE</span>
                <span className="text-amber-400 font-bold text-xs">+{currentVoc.capPerLevel} oz</span>
              </div>
            </div>
          </div>

          {activeTab === 'full_reset' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Nome do Personagem (Opcional):
              </label>
              <input
                type="text"
                value={resetName}
                onChange={(e) => setResetName(e.target.value)}
                maxLength={18}
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs text-gray-100 font-bold placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Nome do novo herói..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {activeTab === 'switch' ? (
              <button
                type="button"
                onClick={handleSwitch}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Confirmar Troca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFullReset}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Resetar Personagem</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
