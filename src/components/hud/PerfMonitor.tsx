import React, { useState, useEffect } from 'react';
import { Activity, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { GameEngine, PerformanceMetrics } from '../../game-client/engine/GameEngine';

interface PerfMonitorProps {
  engine: GameEngine | null;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export const PerfMonitor: React.FC<PerfMonitorProps> = ({
  engine,
  children,
  defaultOpen = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Poll metrics from GameEngine
  useEffect(() => {
    if (!engine) return;

    const interval = setInterval(() => {
      const currentMetrics = engine.getPerformanceMetrics();
      setMetrics(currentMetrics);
    }, 400);

    return () => clearInterval(interval);
  }, [engine]);

  const fps = metrics?.fps ?? 60;
  const fpsColor =
    fps >= 55 ? 'text-emerald-400' : fps >= 35 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="relative w-full h-full">
      {/* Wrapped Canvas / Game Children */}
      {children}

      {/* PerfMonitor HUD Overlay */}
      <div className="absolute top-2 left-2 z-30 pointer-events-auto flex flex-col items-start gap-1 font-mono select-none">
        {/* Compact FPS Badge */}
        <button
          id="perf-monitor-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/75 backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 text-gray-300 hover:border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          title="Ver Estatísticas do Motor Gráfico"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
          <span className={fpsColor}>{fps} FPS</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
          )}
        </button>

        {/* Expanded Panel */}
        {isOpen && (
          <div className="w-64 sm:w-72 bg-black/90 backdrop-blur-xl border border-white/15 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 text-xs text-gray-200 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-100">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-sans text-xs uppercase tracking-wider font-extrabold">
                  Motor Gráfico 60 FPS
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                MODO ÚNICO
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-center flex flex-col items-center">
                <span className="text-[9px] text-gray-400 uppercase">Framerate</span>
                <span className={`text-sm font-black ${fpsColor}`}>{fps} FPS</span>
              </div>
              <div className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/80 text-center flex flex-col items-center">
                <span className="text-[9px] text-gray-400 uppercase">Tempo de Quadro</span>
                <span className="text-sm font-bold text-sky-400">
                  {metrics?.frameTimeMs ?? 16.6} ms
                </span>
              </div>
            </div>

            {/* Render Details */}
            <div className="bg-zinc-950/70 border border-white/5 rounded-lg p-2 flex flex-col gap-1 text-[10px] text-zinc-400">
              <div className="flex justify-between items-center">
                <span>Draw Calls:</span>
                <span className="font-bold text-zinc-200">{metrics?.drawCalls ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Triângulos:</span>
                <span className="font-bold text-zinc-200">{metrics?.triangles.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Entidades 3D Ativas:</span>
                <span className="font-bold text-zinc-200">{metrics?.entitiesCount ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
