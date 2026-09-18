import React from 'react';
import { OfflineReport } from '../../types/game';
import { ITEMS_DATABASE } from '../../constants/items';
import { Clock, Trophy, Coins, Sparkles, CheckCircle2, Skull } from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface OfflineReportModalProps {
  report: OfflineReport | null;
  onClaim: () => void;
}

export const OfflineReportModal: React.FC<OfflineReportModalProps> = ({ report, onClaim }) => {
  if (!report) return null;

  const minutes = Math.floor(report.timeOfflineMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  const timeString = hours > 0 ? `${hours}h ${remainingMins}m` : `${minutes}m`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#121212] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-center">
        {/* Banner */}
        <div className="bg-black/50 border-b border-white/5 p-6 pb-4 flex flex-col items-center">
          <div className="w-14 h-14 rounded-lg bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold uppercase tracking-wider text-gray-100">Offline Progress Report</h2>
          <p className="text-xs text-gray-400 mt-1">
            While you were away, your hero continued fighting in your chosen hunt!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            {/* Time */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col items-center">
              <Clock className="w-4 h-4 text-sky-400 mb-1" />
              <span className="text-[10px] text-gray-500 uppercase">Offline Time</span>
              <span className="text-sm font-bold text-gray-200">{timeString}</span>
            </div>

            {/* Monsters Slain */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col items-center">
              <Skull className="w-4 h-4 text-rose-400 mb-1" />
              <span className="text-[10px] text-gray-500 uppercase">Monsters Slain</span>
              <span className="text-sm font-bold text-gray-200">{report.monstersKilled}</span>
            </div>

            {/* EXP Gained */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col items-center">
              <Sparkles className="w-4 h-4 text-orange-400 mb-1" />
              <span className="text-[10px] text-gray-500 uppercase">EXP Gained</span>
              <span className="text-sm font-bold text-orange-400">+{report.expGained.toLocaleString()}</span>
            </div>

            {/* Gold Earned */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col items-center">
              <Coins className="w-4 h-4 text-yellow-400 mb-1" />
              <span className="text-[10px] text-gray-500 uppercase">Gold Earned</span>
              <span className="text-sm font-bold text-yellow-400">+{report.goldGained.toLocaleString()}</span>
            </div>
          </div>

          {/* Level Up Banner if any */}
          {report.levelsGained > 0 && (
            <div className="bg-green-950/60 border border-green-500/60 rounded-lg p-3 text-green-300 font-bold text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>You advanced {report.levelsGained} level(s) while offline!</span>
            </div>
          )}

          {/* Items Looted */}
          {report.itemsLooted.length > 0 && (
            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Equipment & Treasures Found ({report.itemsLooted.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-black/40 rounded-lg border border-white/5">
                {report.itemsLooted.map((item, idx) => {
                  const def = ITEMS_DATABASE[item.defId];
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-black border border-white/10 rounded text-[10px] font-mono font-bold text-gray-300"
                    >
                      {def?.name || item.defId} {item.count > 1 ? `x${item.count}` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Claim Button */}
          <button
            onClick={() => {
              sounds.playLevelUp();
              onClaim();
            }}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded shadow transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Claim Rewards & Enter Realm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
