import React from 'react';
import { Crown, Sparkles, Coins, Trophy, Award, X, ShieldAlert } from 'lucide-react';
import { ITEMS_DATABASE } from '../../constants/items';

export interface BossDefeatedData {
  bossName: string;
  expGained: number;
  goldGained: number;
  itemsLooted: string[]; // defIds
}

interface BossVictoryModalProps {
  data: BossDefeatedData | null;
  onClose: () => void;
}

export const BossVictoryModal: React.FC<BossVictoryModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#121212] border-2 border-amber-500 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.35)] overflow-hidden text-center p-6 space-y-6">
        {/* Top Floating Glow Emblem */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
          <Crown className="w-8 h-8" />
        </div>

        {/* Title & Boss Name */}
        <div>
          <div className="text-xs uppercase font-extrabold tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" /> GLÓRIA NA ARENA <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <h2 className="text-3xl font-black text-amber-100 font-mono tracking-tight mt-1">
            {data.bossName} Derrotado!
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            O poderoso chefe sucumbiu perante a sua coragem e habilidade lendária!
          </p>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-amber-500/30">
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Recompensa EXP
            </span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              +{data.expGained.toLocaleString()}
            </span>
          </div>

          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> Ouro Saqueado
            </span>
            <span className="text-lg font-black text-yellow-400 font-mono mt-0.5">
              +{data.goldGained.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Loot Item Cards */}
        {data.itemsLooted.length > 0 && (
          <div>
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
              <Award className="w-4 h-4 text-amber-400" /> Recompensas & Tesouros Raros
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {data.itemsLooted.map((defId, idx) => {
                const itemDef = ITEMS_DATABASE[defId];
                if (!itemDef) return null;

                return (
                  <div
                    key={idx}
                    className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/60 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-200 shadow-md"
                  >
                    <span className="text-base">🗡️</span>
                    <span>{itemDef.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer active:scale-95"
        >
          Continuar Jornada
        </button>
      </div>
    </div>
  );
};
