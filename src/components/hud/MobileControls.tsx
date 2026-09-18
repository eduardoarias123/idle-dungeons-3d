import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Swords, HeartPulse, Zap } from 'lucide-react';

interface MobileControlsProps {
  onDirectionMove: (dx: number, dz: number) => void;
  onAttack: () => void;
  onUsePotion: () => void;
  onCastPrimary: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onDirectionMove,
  onAttack,
  onUsePotion,
  onCastPrimary,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex justify-between items-end p-4 pb-20 sm:hidden">
      {/* Left: Virtual D-Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-1 bg-zinc-950/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div />
        <button
          onClick={() => onDirectionMove(0, -2)}
          className="w-12 h-12 bg-zinc-900/90 active:bg-amber-600/80 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-200 active:scale-95 transition-transform"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />

        <button
          onClick={() => onDirectionMove(-2, 0)}
          className="w-12 h-12 bg-zinc-900/90 active:bg-amber-600/80 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-200 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-12 h-12 flex items-center justify-center text-[10px] font-bold text-zinc-500">
          MOVE
        </div>
        <button
          onClick={() => onDirectionMove(2, 0)}
          className="w-12 h-12 bg-zinc-900/90 active:bg-amber-600/80 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-200 active:scale-95 transition-transform"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        <div />
        <button
          onClick={() => onDirectionMove(0, 2)}
          className="w-12 h-12 bg-zinc-900/90 active:bg-amber-600/80 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-200 active:scale-95 transition-transform"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <div />
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          onClick={onUsePotion}
          className="w-13 h-13 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-300 active:scale-90 shadow-lg"
        >
          <HeartPulse className="w-6 h-6" />
        </button>
        <button
          onClick={onCastPrimary}
          className="w-13 h-13 rounded-full bg-amber-950/80 border-2 border-amber-500 flex items-center justify-center text-amber-300 active:scale-90 shadow-lg"
        >
          <Zap className="w-6 h-6" />
        </button>
        <button
          onClick={onAttack}
          className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-amber-400 flex items-center justify-center text-white active:scale-90 shadow-2xl"
        >
          <Swords className="w-8 h-8 text-amber-400" />
        </button>
      </div>
    </div>
  );
};
