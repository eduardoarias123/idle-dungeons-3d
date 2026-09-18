import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, Swords, X } from 'lucide-react';

export interface WaveTransitionData {
  previousWave: number;
  newWave: number;
  bossDefeatedName?: string;
  mapName?: string;
}

export interface BossAlertData {
  wave: number;
  bossName: string;
}

interface WaveTransitionOverlayProps {
  transitionData: WaveTransitionData | null;
  bossAlert: BossAlertData | null;
  onClearTransition: () => void;
  onClearBossAlert: () => void;
}

export const WaveTransitionOverlay: React.FC<WaveTransitionOverlayProps> = ({
  transitionData,
  bossAlert,
  onClearTransition,
  onClearBossAlert,
}) => {
  const [flashType, setFlashType] = useState<'gold' | 'red' | null>(null);

  const clearTransitionRef = useRef(onClearTransition);
  clearTransitionRef.current = onClearTransition;

  const clearBossAlertRef = useRef(onClearBossAlert);
  clearBossAlertRef.current = onClearBossAlert;

  // Trigger flash & auto-dismiss for Wave Transitions
  useEffect(() => {
    if (!transitionData) return;

    setFlashType('gold');
    const flashTimer = setTimeout(() => {
      setFlashType(null);
    }, 500);

    const dismissTimer = setTimeout(() => {
      clearTransitionRef.current();
    }, 2800);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(dismissTimer);
    };
  }, [transitionData?.newWave, transitionData?.previousWave]);

  // Trigger flash & auto-dismiss for Boss Alerts
  useEffect(() => {
    if (!bossAlert) return;

    setFlashType('red');
    const flashTimer = setTimeout(() => {
      setFlashType(null);
    }, 500);

    const dismissTimer = setTimeout(() => {
      clearBossAlertRef.current();
    }, 2800);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(dismissTimer);
    };
  }, [bossAlert?.wave, bossAlert?.bossName]);

  return (
    <>
      {/* Subtle Screen Edge Flash Layer */}
      {flashType === 'gold' && (
        <div
          id="wave-screen-flash-gold"
          className="fixed inset-0 pointer-events-none z-50 animate-wave-flash-gold bg-amber-500/10 shadow-[inset_0_0_80px_rgba(245,158,11,0.35)]"
        />
      )}

      {flashType === 'red' && (
        <div
          id="wave-screen-flash-red"
          className="fixed inset-0 pointer-events-none z-50 animate-wave-flash-red bg-red-600/15 shadow-[inset_0_0_80px_rgba(239,68,68,0.4)]"
        />
      )}

      {/* Top Banner Notifications (Compact, Unobtrusive, Dismissable) */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 max-w-sm w-[92vw]">
        <AnimatePresence mode="wait">
          {transitionData && (
            <motion.div
              key={`wave-${transitionData.newWave}`}
              initial={{ opacity: 0, scale: 0.9, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto relative w-full bg-slate-950/95 border border-amber-500/70 shadow-[0_4px_20px_rgba(245,158,11,0.3)] backdrop-blur-md rounded-xl p-3 px-4 flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* Gold Top Light Bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
                  <Swords className="w-5 h-5 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                    <span>Onda {transitionData.previousWave} Concluída</span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-100 font-mono truncate">
                    ⚔️ Onda {transitionData.newWave} Iniciada
                  </h3>
                </div>
              </div>

              <button
                onClick={onClearTransition}
                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-100 hover:bg-amber-500/20 transition-colors shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {bossAlert && !transitionData && (
            <motion.div
              key={`boss-${bossAlert.wave}`}
              initial={{ opacity: 0, scale: 0.9, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto relative w-full bg-slate-950/95 border border-red-500/80 shadow-[0_4px_22px_rgba(239,68,68,0.4)] backdrop-blur-md rounded-xl p-3 px-4 flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* Red Top Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/50 text-red-400 shrink-0">
                  <Skull className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span>Chefe da Onda {bossAlert.wave}</span>
                  </div>
                  <h3 className="text-sm font-bold text-red-100 font-mono truncate">
                    💀 {bossAlert.bossName} Despertou!
                  </h3>
                </div>
              </div>

              <button
                onClick={onClearBossAlert}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-100 hover:bg-red-500/20 transition-colors shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

