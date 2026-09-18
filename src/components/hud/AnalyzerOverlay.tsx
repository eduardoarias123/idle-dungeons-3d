import React, { useState, useEffect, useRef } from 'react';
import { Activity, BarChart3, ChevronDown, ChevronRight, RotateCcw, Skull, Coins, Zap, Heart, TrendingUp, Clock } from 'lucide-react';
import { CharacterData } from '../../types/game';

interface AnalyzerOverlayProps {
  character: CharacterData;
}

interface DamageRecord {
  timestamp: number;
  damage: number;
}

interface HealRecord {
  timestamp: number;
  heal: number;
}

export const AnalyzerOverlay: React.FC<AnalyzerOverlayProps> = ({ character }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Session start time
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Stats tracking
  const [initialExp, setInitialExp] = useState<number>(character.experience);
  const [damageHistory, setDamageHistory] = useState<DamageRecord[]>([]);
  const [healHistory, setHealHistory] = useState<HealRecord[]>([]);
  const [sessionKills, setSessionKills] = useState<number>(0);
  const [sessionGold, setSessionGold] = useState<number>(0);

  const prevCharRef = useRef<CharacterData>(character);

  // Timer loop for elapsed seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Track experience gains, kills, and gold changes
  useEffect(() => {
    const prev = prevCharRef.current;
    if (prev) {
      if (character.killsCount > prev.killsCount) {
        setSessionKills((k) => k + (character.killsCount - prev.killsCount));
      }
      if (character.gold > prev.gold) {
        setSessionGold((g) => g + (character.gold - prev.gold));
      }
      if (character.hp > prev.hp) {
        const healAmt = character.hp - prev.hp;
        setHealHistory((h) => [...h, { timestamp: Date.now(), heal: healAmt }]);
      }
    }
    prevCharRef.current = character;
  }, [character]);

  // Calculate DPS & HPS (rolling 5 second window)
  const now = Date.now();
  const recentDmg = damageHistory.filter((d) => now - d.timestamp <= 5000);
  const totalDmg5s = recentDmg.reduce((sum, d) => sum + d.damage, 0);
  const currentDps = Math.round(totalDmg5s / 5);

  const recentHeals = healHistory.filter((h) => now - h.timestamp <= 5000);
  const totalHeals5s = recentHeals.reduce((sum, h) => sum + h.heal, 0);
  const currentHps = Math.round(totalHeals5s / 5);

  // Calculate EXP / Hour
  const expGained = Math.max(0, character.experience - initialExp);
  const hoursElapsed = Math.max(0.001, elapsedSeconds / 3600);
  const expPerHour = Math.round(expGained / hoursElapsed);

  // Reset Session
  const handleReset = () => {
    setSessionStartTime(Date.now());
    setElapsedSeconds(0);
    setInitialExp(character.experience);
    setDamageHistory([]);
    setHealHistory([]);
    setSessionKills(0);
    setSessionGold(0);
  };

  // Format time HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format large numbers (12.5k, 1.2M)
  const formatNum = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  return (
    <div className="fixed top-[95px] left-3 z-20 pointer-events-auto select-none font-mono">
      {/* Minimized Floating Badge */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 bg-[#12161c]/90 backdrop-blur-xs border-2 border-[#5c4a38] hover:border-[#facc15] px-3 py-1.5 rounded text-xs text-[#facc15] shadow-2xl cursor-pointer transition-all active:scale-95 group"
        >
          <Activity className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="font-bold">Analyzer ({currentDps} DPS)</span>
        </button>
      ) : (
        /* Full Expanded Side Panel */
        <div className="w-64 bg-[#12161c]/90 backdrop-blur-xs border-2 border-[#5c4a38] rounded overflow-hidden shadow-2xl text-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33] px-3 py-1.5">
            <div className="flex items-center gap-2 text-[#facc15] font-bold text-xs uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>HUNT ANALYZER</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-0.5 hover:bg-[#3d4857] rounded text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Reiniciar Métricas da Hunt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-0.5 hover:bg-[#3d4857] rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Minimizar Painel"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Grid Stats */}
          <div className="p-3 space-y-2 text-[11px]">
            {/* Session Timer */}
            <div className="flex items-center justify-between bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Tempo de Hunt:
              </span>
              <span className="font-bold text-slate-200">{formatTime(elapsedSeconds)}</span>
            </div>

            {/* EXP / Hour */}
            <div className="flex items-center justify-between bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded">
              <span className="flex items-center gap-1.5 text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> EXP / Hora:
              </span>
              <span className="font-bold text-emerald-400">+{formatNum(expPerHour)}</span>
            </div>

            {/* DPS & HPS */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded flex flex-col justify-center">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Zap className="w-3 h-3 text-amber-400" /> DPS
                </span>
                <span className="font-bold text-[#facc15] text-xs mt-0.5">{currentDps}</span>
              </div>
              <div className="bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded flex flex-col justify-center">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Heart className="w-3 h-3 text-rose-400" /> HPS
                </span>
                <span className="font-bold text-rose-400 text-xs mt-0.5">{currentHps}</span>
              </div>
            </div>

            {/* Session Kills & Looted Gold */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded flex flex-col justify-center">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Skull className="w-3 h-3 text-purple-400" /> Kills
                </span>
                <span className="font-bold text-purple-300 text-xs mt-0.5">{sessionKills}</span>
              </div>
              <div className="bg-[#1a1f26]/80 border border-[#3d4857] p-1.5 rounded flex flex-col justify-center">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Coins className="w-3 h-3 text-amber-400" /> Ouro
                </span>
                <span className="font-bold text-[#facc15] text-xs mt-0.5">+{formatNum(sessionGold)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
