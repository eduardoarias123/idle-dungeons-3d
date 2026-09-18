import React, { useEffect, useState } from 'react';
import { Flame, Zap, Trophy } from 'lucide-react';

interface ComboCounterHUDProps {
  comboHits: number;
}

export const ComboCounterHUD: React.FC<ComboCounterHUDProps> = ({ comboHits }) => {
  const [displayHits, setDisplayHits] = useState(0);
  const [comboTimer, setComboTimer] = useState(100);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (comboHits > 0) {
      setDisplayHits(comboHits);
      setComboTimer(100);
      setIsVisible(true);
    }
  }, [comboHits]);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setComboTimer((prev) => {
        if (prev <= 0) {
          setIsVisible(false);
          return 0;
        }
        return prev - 2.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || displayHits < 2) return null;

  let rankText = 'C-RANK';
  let rankColor = 'text-sky-400 border-sky-400/50 bg-sky-950/60 shadow-sky-500/30';
  let bannerGradient = 'from-sky-500 via-blue-600 to-indigo-600';

  if (displayHits >= 50) {
    rankText = 'SSS FEVER';
    rankColor = 'text-fuchsia-300 border-fuchsia-400/80 bg-fuchsia-950/80 shadow-fuchsia-500/50 animate-pulse';
    bannerGradient = 'from-fuchsia-500 via-rose-500 to-amber-400';
  } else if (displayHits >= 30) {
    rankText = 'SS-RANK';
    rankColor = 'text-amber-300 border-amber-400/80 bg-amber-950/80 shadow-amber-500/50';
    bannerGradient = 'from-amber-400 via-orange-500 to-red-500';
  } else if (displayHits >= 20) {
    rankText = 'S-RANK';
    rankColor = 'text-emerald-300 border-emerald-400/70 bg-emerald-950/70 shadow-emerald-500/40';
    bannerGradient = 'from-emerald-400 via-teal-500 to-cyan-500';
  } else if (displayHits >= 10) {
    rankText = 'A-RANK';
    rankColor = 'text-purple-300 border-purple-400/60 bg-purple-950/60 shadow-purple-500/30';
    bannerGradient = 'from-purple-500 via-indigo-500 to-blue-500';
  } else if (displayHits >= 5) {
    rankText = 'B-RANK';
    rankColor = 'text-blue-300 border-blue-400/50 bg-blue-950/60 shadow-blue-500/30';
    bannerGradient = 'from-blue-400 via-indigo-500 to-sky-500';
  }

  return (
    <div className="fixed top-16 right-3 sm:right-5 z-20 pointer-events-none flex flex-col items-end select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Lunia Combo Badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-black px-2.5 py-0.5 rounded-md border shadow-lg uppercase tracking-wider ${rankColor}`}>
          {rankText}
        </span>
        <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
      </div>

      {/* Big Combo Hit Counter */}
      <div className="flex items-baseline gap-1">
        <span className={`text-4xl sm:text-5xl font-black italic tracking-tighter bg-gradient-to-br ${bannerGradient} bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}>
          {displayHits}
        </span>
        <span className="text-sm sm:text-base font-black italic uppercase text-amber-300 tracking-wider drop-shadow-md">
          HITS!
        </span>
      </div>

      {/* Combo Decay Bar */}
      <div className="w-28 sm:w-36 h-1.5 bg-black/60 border border-white/20 rounded-full overflow-hidden mt-1 shadow-md">
        <div
          className={`h-full bg-gradient-to-r ${bannerGradient} transition-all duration-75`}
          style={{ width: `${comboTimer}%` }}
        />
      </div>
    </div>
  );
};
