import React, { useState } from 'react';
import { CharacterData, EquipmentSlot } from '../../types/game';
import { ITEMS_DATABASE } from '../../constants/items';
import { Sparkles, Flame, Zap, HeartPulse, Droplet, Shield, X, Coins, CheckCircle2 } from 'lucide-react';
import { gameSocket } from '../../game-client/network/GameSocket';

interface EnchantingModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
}

const ENCHANTMENTS_LIST = [
  {
    id: 'fire',
    name: 'Runa do Fogo Ancestral',
    bonusText: '+15% Dano Elementar de Fogo em todos os ataques',
    type: 'fire',
    costGold: 400,
    color: '#f97316',
    icon: Flame,
    desc: 'Imbui a lâmina ou armadura com chamas ancestrais do vulcão de Goroma.',
  },
  {
    id: 'crit',
    name: 'Runa da Tempestade',
    bonusText: '+10% Chance de Acerto Crítico',
    type: 'crit',
    costGold: 500,
    color: '#facc15',
    icon: Zap,
    desc: 'Canaliza trovões das terras distantes aumentando drasticamente os acertos críticos.',
  },
  {
    id: 'vampirism',
    name: 'Runa Vampírica',
    bonusText: '+4% Roubo de Vida (Suga HP ao causar dano)',
    type: 'vampirism',
    costGold: 600,
    color: '#ef4444',
    icon: HeartPulse,
    desc: 'Encantamento sombrio das mpias que converte parte do dano causado em restauração vital.',
  },
  {
    id: 'void',
    name: 'Runa Drenadora do Vazio',
    bonusText: '+3% Roubo de Mana (Suga Mana ao causar dano)',
    type: 'void',
    costGold: 600,
    color: '#c084fc',
    icon: Droplet,
    desc: 'Extrai energia arcana do alvo a cada golpe direto, recuperando mana continuamente.',
  },
  {
    id: 'aegis',
    name: 'Runa Protetora de Aegis',
    bonusText: '+12 de Defesa e Shielding',
    type: 'aegis',
    costGold: 500,
    color: '#38bdf8',
    icon: Shield,
    desc: 'Fortalece a estrutura do equipamento com uma barreira mística protetora indescritível.',
  },
];

export const EnchantingModal: React.FC<EnchantingModalProps> = ({ character, isOpen, onClose }) => {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('weapon');
  const [selectedEnchId, setSelectedEnchId] = useState<string>('fire');

  if (!isOpen) return null;

  const equippedSlots: { slot: EquipmentSlot; label: string }[] = [
    { slot: 'weapon', label: 'Arma Principal' },
    { slot: 'armor', label: 'Armadura (Peitoral)' },
    { slot: 'helmet', label: 'Elmo' },
    { slot: 'legs', label: 'Calças' },
    { slot: 'boots', label: 'Botas' },
    { slot: 'shield', label: 'Escudo' },
  ];

  const targetItem = character.equipment[selectedSlot];
  const targetDef = targetItem ? ITEMS_DATABASE[targetItem.defId] : null;

  const selectedEnch = ENCHANTMENTS_LIST.find((e) => e.id === selectedEnchId) || ENCHANTMENTS_LIST[0];
  const canAfford = character.gold >= selectedEnch.costGold;

  const handleEnchant = () => {
    if (!targetItem) return;
    gameSocket.enchantItem(targetItem.instanceId, selectedEnch.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-200 flex items-center gap-2">
                Altar de Encantamentos Rúnicos
              </h2>
              <p className="text-xs text-zinc-400">
                Imbua seus equipamentos com poderes arcanos elementares e efeitos de drenagem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Select Equipment Slot */}
          <div>
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              1. Selecione o Equipamento para Encantar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {equippedSlots.map(({ slot, label }) => {
                const item = character.equipment[slot];
                const def = item ? ITEMS_DATABASE[item.defId] : null;
                const isSelected = selectedSlot === slot;

                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-zinc-400 uppercase truncate">{label}</div>
                    {def ? (
                      <div>
                        <div className="text-xs font-bold text-amber-200 truncate">{def.name}</div>
                        {item?.enchantment ? (
                          <div className="text-[9px] font-bold truncate" style={{ color: item.enchantment.color }}>
                            ✨ {item.enchantment.name}
                          </div>
                        ) : (
                          <div className="text-[9px] text-zinc-500">Sem encantamento</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs italic text-zinc-600">Nenhum item equipado</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Item Preview */}
          {targetItem && targetDef ? (
            <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
                  🗡️
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-200">{targetDef.name}</div>
                  <div className="text-[11px] text-zinc-400">
                    Ataque: {targetDef.attack || 0} | Defesa: {targetDef.defense || targetDef.armor || 0}
                  </div>
                </div>
              </div>
              {targetItem.enchantment && (
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">Encantamento Ativo:</div>
                  <div className="text-xs font-bold" style={{ color: targetItem.enchantment.color }}>
                    {targetItem.enchantment.bonusText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-xl text-xs text-red-300 text-center">
              Nenhum item equipado no slot de {selectedSlot}. Equipe um item primeiro para poder encantá-lo.
            </div>
          )}

          {/* 2. Select Enchantment Rune */}
          <div>
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              2. Escolha a Runa Mística de Encantamento
            </label>
            <div className="space-y-2">
              {ENCHANTMENTS_LIST.map((ench) => {
                const Icon = ench.icon;
                const isSelected = selectedEnchId === ench.id;

                return (
                  <div
                    key={ench.id}
                    onClick={() => setSelectedEnchId(ench.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-500/80 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg border shadow-sm"
                        style={{ backgroundColor: `${ench.color}20`, borderColor: `${ench.color}50`, color: ench.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                          <span>{ench.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300">
                            {ench.bonusText}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">{ench.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 font-mono">Custo</div>
                        <div className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-yellow-400" />
                          {ench.costGold}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            Seu Ouro: <span className="font-bold text-amber-300">{character.gold.toLocaleString()} Gold</span>
          </div>

          <button
            onClick={handleEnchant}
            disabled={!targetItem || !canAfford}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              targetItem && canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 active:scale-95'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Encantar Item ({selectedEnch.costGold} Gold)
          </button>
        </div>
      </div>
    </div>
  );
};
