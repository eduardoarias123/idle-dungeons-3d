import React, { useState, useEffect } from 'react';
import { CharacterData, PartyState } from '../../types/game';
import { partyNetwork } from '../../game-client/network/PartyNetworkManager';
import { Crown, MapPin, Users } from 'lucide-react';

interface PartyHUDProps {
  character: CharacterData;
  onOpenPartyModal: () => void;
}

export const PartyHUD: React.FC<PartyHUDProps> = ({
  character,
  onOpenPartyModal,
}) => {
  const [partyState, setPartyState] = useState<PartyState>(partyNetwork.getPartyState());

  useEffect(() => {
    const handlePartyUpdate = (state: PartyState) => {
      setPartyState({ ...state });
    };

    const unsubscribe = partyNetwork.subscribePartyState(handlePartyUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  if (!partyState.partyCode || partyState.members.length <= 1) {
    return null;
  }

  // Filter out local player so we only show teammates in the squad list
  const teammates = partyState.members.filter((m) => m.id !== character.id);

  if (teammates.length === 0) return null;

  return (
    <div className="fixed top-24 left-2 sm:left-4 z-20 pointer-events-none flex flex-col gap-1.5 select-none animate-in fade-in slide-in-from-left duration-200">
      <div
        onClick={onOpenPartyModal}
        className="pointer-events-auto bg-zinc-950/85 backdrop-blur-md border border-emerald-500/40 p-1.5 rounded-xl shadow-xl flex flex-col gap-1.5 min-w-[190px] cursor-pointer hover:border-emerald-400 transition-colors"
        title="Clique para gerenciar o Grupo (Party)"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1 px-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            <Users className="w-3 h-3" />
            <span>Grupo &bull; {partyState.partyCode}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] px-1 py-0.2 bg-zinc-800 text-amber-300 rounded font-bold uppercase tracking-wider">
              {partyState.lootMode === 'shared' ? 'Shared' : partyState.lootMode === 'leader_priority' ? 'Líder' : 'FFA'}
            </span>
            <span className="text-[9px] text-emerald-300/90 font-mono font-bold">
              +{partyState.sharedExpBonusPercent || 20}% EXP
            </span>
          </div>
        </div>

        {teammates.map((mate) => {
          const hpPercent = mate.maxHp ? Math.min(100, Math.max(0, (mate.hp / mate.maxHp) * 100)) : 100;
          return (
            <div key={mate.id} className="flex items-center gap-2 px-1 py-0.5">
              <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[9px] font-black text-amber-300 shrink-0">
                {mate.vocation.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-200 mb-0.5">
                  <span className="truncate">{mate.name}</span>
                  {mate.isLeader && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </div>
                <div className="h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
