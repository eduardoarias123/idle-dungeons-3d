import React, { useEffect } from 'react';
import { CharacterData, CombatStance } from '../../types/game';
import { SPELLS_DATABASE } from '../../constants/spells';
import { Swords, HeartPulse, Droplet, Sparkles, Flame, Zap, Crosshair, Sun, Shield, Sword, Scale, Bot } from 'lucide-react';

interface ActionBarProps {
  character: CharacterData;
  onCastSpell: (spellId: string) => void;
  onUsePotion: (type: 'health' | 'mana') => void;
  onAutoTarget: () => void;
  onSetStance?: (stance: CombatStance) => void;
  isAutoHunting?: boolean;
  onToggleAutoHunt?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  character,
  onCastSpell,
  onUsePotion,
  onAutoTarget,
  onSetStance,
  isAutoHunting = false,
  onToggleAutoHunt,
}) => {
  const hpPotCount = character.inventory.find((i) => i.defId === 'potion_health')?.count || 0;
  const manaPotCount = character.inventory.find((i) => i.defId === 'potion_mana')?.count || 0;
  const currentStance = character.stance || 'balanced';

  // Unlocked Spells for quick slots (excluding light spells which have dedicated slot L)
  const spells = character.unlockedSpells
    .map((s) => SPELLS_DATABASE[s])
    .filter((s) => s && s.id !== 'utevo_lux' && s.id !== 'utevo_gran_lux');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in chat input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key;
      if (key === '1' || key === 'F1') {
        e.preventDefault();
        onAutoTarget();
      } else if (key === '2' || key === 'F2') {
        e.preventDefault();
        if (hpPotCount > 0) onUsePotion('health');
      } else if (key === '3' || key === 'F3') {
        e.preventDefault();
        if (manaPotCount > 0) onUsePotion('mana');
      } else if (key === 'l' || key === 'L') {
        e.preventDefault();
        onCastSpell('utevo_lux');
      } else if (['4', '5', '6', '7', '8'].includes(key)) {
        const idx = parseInt(key, 10) - 4;
        if (spells[idx]) {
          e.preventDefault();
          onCastSpell(spells[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hpPotCount, manaPotCount, spells, onAutoTarget, onUsePotion, onCastSpell]);

  return (
    <div className="fixed bottom-3 left-0 right-0 z-20 pointer-events-none flex justify-center px-2 select-none">
      {/* Center Action Hotkeys Bar */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-[#12161c] border-2 border-[#5c4a38] p-1.5 rounded shadow-2xl font-mono text-slate-200">
        {/* Combat Stances & Cavebot */}
        {onSetStance && (
          <div className="flex items-center gap-1 bg-[#1a1f26] border border-[#3d4857] p-1 rounded" title="Posturas de Combate">
            <button
              onClick={() => onSetStance('full_attack')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                currentStance === 'full_attack'
                  ? 'bg-red-600/40 border border-red-500 text-red-400 font-bold shadow-md shadow-red-950/50 scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
              }`}
              title="Postura: Ataque Total ⚔️ (1.25x Dano Causado)"
            >
              <Sword className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetStance('balanced')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                currentStance === 'balanced'
                  ? 'bg-amber-600/40 border border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/50 scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
              }`}
              title="Postura: Equilibrada ⚖️ (1.0x Dano / Defesa Normal)"
            >
              <Scale className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetStance('full_defense')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                currentStance === 'full_defense'
                  ? 'bg-sky-600/40 border border-sky-500 text-sky-300 font-bold shadow-md shadow-sky-950/50 scale-105'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
              }`}
              title="Postura: Defesa Total 🛡️ (0.65x Dano / +35% Bloqueio Total com Escudo)"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>

            {onToggleAutoHunt && (
              <>
                <div className="h-4 w-px bg-zinc-800 mx-0.5" />
                <button
                  onClick={onToggleAutoHunt}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    isAutoHunting
                      ? 'bg-orange-600/40 border border-orange-500 text-orange-400 font-bold shadow-md shadow-orange-950/50 scale-105 animate-pulse'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
                  }`}
                  title={isAutoHunting ? 'Desativar Cavebot (Auto-Hunt)' : 'Ativar Cavebot (Auto-Hunt Automático)'}
                >
                  <Bot className={`w-3.5 h-3.5 ${isAutoHunting ? 'text-orange-400' : ''}`} />
                </button>
              </>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-zinc-800/90 mx-0.5" />

        {/* Slot 1: Attack */}
        <button
          onClick={onAutoTarget}
          className="w-11 h-11 sm:w-12 sm:h-12 bg-zinc-900/90 border border-amber-500/40 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center text-[10px] text-zinc-300 relative group cursor-pointer transition-all active:scale-95 shadow-md"
          title="Auto-Target & Basic Attack (Hotkey: 1)"
        >
          <div className="absolute inset-0 bg-amber-500/10 hidden group-hover:block rounded-xl pointer-events-none" />
          <Swords className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-bold text-zinc-300 mt-0.5">ATK</span>
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-amber-400 font-bold">1</span>
        </button>

        {/* Slot 2: Health Potion */}
        <button
          onClick={() => onUsePotion('health')}
          disabled={hpPotCount <= 0}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center text-[10px] relative group transition-all active:scale-95 shadow-md ${
            hpPotCount > 0
              ? 'bg-red-950/40 border border-red-500/60 hover:border-red-400 text-red-300 cursor-pointer'
              : 'bg-zinc-900/50 border border-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed'
          }`}
          title="Health Potion - Restores 120 HP (Hotkey: 2)"
        >
          <div className="absolute inset-0 bg-red-500/15 hidden group-hover:block rounded-xl pointer-events-none" />
          <HeartPulse className="w-4 h-4 group-hover:scale-110 transition-transform text-red-400" />
          <span className="text-[8px] font-mono font-bold mt-0.5">+{hpPotCount}</span>
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-red-400 font-bold">2</span>
        </button>

        {/* Slot 3: Mana Potion */}
        <button
          onClick={() => onUsePotion('mana')}
          disabled={manaPotCount <= 0}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center text-[10px] relative group transition-all active:scale-95 shadow-md ${
            manaPotCount > 0
              ? 'bg-sky-950/40 border border-sky-500/60 hover:border-sky-400 text-sky-300 cursor-pointer'
              : 'bg-zinc-900/50 border border-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed'
          }`}
          title="Mana Potion - Restores 100 MP (Hotkey: 3)"
        >
          <div className="absolute inset-0 bg-sky-500/15 hidden group-hover:block rounded-xl pointer-events-none" />
          <Droplet className="w-4 h-4 group-hover:scale-110 transition-transform text-sky-400" />
          <span className="text-[8px] font-mono font-bold mt-0.5">+{manaPotCount}</span>
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-sky-400 font-bold">3</span>
        </button>

        {/* Slot Light: Utevo Lux */}
        <button
          onClick={() => onCastSpell('utevo_lux')}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center text-[10px] relative group transition-all active:scale-95 shadow-md bg-amber-950/50 border border-amber-400/80 hover:border-amber-300 text-amber-200 cursor-pointer"
          title="Invocação de Luz Mágica (Utevo Lux) - Ilumina a masmorra! (Hotkey: L)"
        >
          <div className="absolute inset-0 bg-amber-400/20 hidden group-hover:block rounded-xl pointer-events-none" />
          <Sun className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-300 animate-pulse" />
          <span className="text-[8px] font-mono font-bold mt-0.5 text-amber-300">LUZ</span>
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-amber-300 font-bold">L</span>
        </button>

        {/* Subtle Divider */}
        <div className="h-6 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

        {/* Spells & Runes Slots 4-8 */}
        {spells.slice(0, 5).map((spell, idx) => {
          const isRune = spell.isRune;
          const charges = isRune ? (character.runeCharges?.[spell.id] || 0) : null;
          const canCast = isRune ? (charges !== null && charges > 0) : (character.mana >= spell.manaCost);
          const slotNum = idx + 4;

          return (
            <button
              key={spell.id}
              onClick={() => onCastSpell(spell.id)}
              disabled={!canCast}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center text-[10px] relative group transition-all active:scale-95 shadow-md ${
                canCast
                  ? isRune
                    ? 'bg-purple-950/40 border border-purple-500/50 hover:border-purple-300 text-purple-200 cursor-pointer'
                    : 'bg-zinc-900/90 border border-zinc-700 hover:border-amber-400 text-zinc-200 cursor-pointer'
                  : 'bg-zinc-900/40 border border-zinc-800/80 text-zinc-600 opacity-40 cursor-not-allowed'
              }`}
              title={`${spell.name} (${spell.words}) - ${isRune ? `Rune Charges: ${charges}x` : `Cost: ${spell.manaCost} MP`} (Hotkey: ${slotNum})`}
            >
              <div className="absolute inset-0 bg-amber-500/10 hidden group-hover:block rounded-xl pointer-events-none" />
              {spell.isHeal ? (
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              ) : isRune ? (
                <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              ) : spell.element === 'energy' ? (
                <Zap className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              ) : spell.element === 'holy' ? (
                <Crosshair className="w-3.5 h-3.5 text-yellow-300 group-hover:scale-110 transition-transform" />
              ) : (
                <Flame className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[7.5px] sm:text-[8px] font-mono font-bold truncate max-w-[40px] mt-0.5">
                {spell.words}
              </span>
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-zinc-400 font-bold">
                {slotNum}
              </span>
              <span className={`absolute bottom-0.5 right-1 text-[7px] font-mono ${isRune ? 'text-purple-300 font-bold' : 'text-sky-400/90'}`}>
                {isRune ? `${charges}x` : `${spell.manaCost}m`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
