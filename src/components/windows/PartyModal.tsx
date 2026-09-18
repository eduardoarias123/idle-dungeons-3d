import React, { useState, useEffect } from 'react';
import { CharacterData, PartyState } from '../../types/game';
import { partyNetwork } from '../../game-client/network/PartyNetworkManager';
import { sounds } from '../../game-client/audio/SoundEffects';
import {
  Users,
  UserPlus,
  LogOut,
  Copy,
  Check,
  Shield,
  Crown,
  Sparkles,
  MapPin,
  X,
  Swords,
  Heart,
  Share2,
} from 'lucide-react';

interface PartyModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onSwitchMap: (mapId: string) => void;
}

export const PartyModal: React.FC<PartyModalProps> = ({
  character,
  isOpen,
  onClose,
  onSwitchMap,
}) => {
  const [partyState, setPartyState] = useState<PartyState>(partyNetwork.getPartyState());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handlePartyUpdate = (state: PartyState) => {
      setPartyState({ ...state });
    };

    const unsubscribe = partyNetwork.subscribePartyState(handlePartyUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleCreateParty = () => {
    setErrorMsg(null);
    const code = 'LUNIA-' + Math.floor(100 + Math.random() * 900);
    partyNetwork.joinParty(code, true);
    sounds.playLevelUp();
  };

  const handleJoinParty = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Digite um código de grupo válido.');
      return;
    }
    setErrorMsg(null);
    partyNetwork.joinParty(clean, false);
    sounds.playSwordSwing();
    setJoinCodeInput('');
  };

  const handleLeaveParty = () => {
    partyNetwork.leaveParty();
    sounds.playSwordSwing();
  };

  const handleCopyCode = () => {
    if (partyState.partyCode) {
      navigator.clipboard?.writeText(partyState.partyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isInParty = Boolean(partyState.partyCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
              SISTEMA DE GRUPO (MULTI-PLAYER)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Fechar Janela"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Party Co-op Feature Highlights */}
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 text-xs">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-zinc-300 space-y-0.5 text-[11px]">
              <span className="font-bold text-emerald-300 block">Dungeons 100% Sincronizadas:</span>
              <p className="text-zinc-400 leading-snug">
                Mesmo layout de salas, monstros nas mesmas coordenadas, baús sincronizados e <span className="text-emerald-400 font-bold">+15% Bônus de EXP</span> para todos os membros!
              </p>
            </div>
          </div>

          {!isInParty ? (
            /* Not in party: Create or Join */
            <div className="flex flex-col gap-4">
              {/* Option 1: Create New Party */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-zinc-200">Criar Novo Grupo</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Você será o Líder
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Cria uma sala exclusiva e gera um código para você compartilhar com seus amigos.
                </p>
                <button
                  onClick={handleCreateParty}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Sala de Grupo Agora</span>
                </button>
              </div>

              {/* Option 2: Join Existing Party */}
              <form onSubmit={handleJoinParty} className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs text-zinc-200">Entrar em Grupo Existente</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Insira o código do grupo compartilhado pelo seu amigo para sincronizar a mesma dungeon:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: LUNIA-472"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-zinc-950 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Entrar
                  </button>
                </div>
                {errorMsg && <span className="text-xs text-red-400">{errorMsg}</span>}
              </form>
            </div>
          ) : (
            /* Active Party View */
            <div className="flex flex-col gap-3.5">
              {/* Party Code Card */}
              <div className="bg-zinc-900/90 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                    Código do Grupo (Compartilhe com amigos):
                  </span>
                  <span className="text-lg font-black font-mono tracking-widest text-emerald-300">
                    {partyState.partyCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/10"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              {/* Party Configuration: Loot Mode & Shared Experience */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-200">Modo de Divisão de Loot</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {partyNetwork.isLeader ? 'Você pode alterar' : 'Definido pelo Líder'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={!partyNetwork.isLeader}
                    onClick={() => partyNetwork.setLootMode('shared')}
                    className={`p-2 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                      partyState.lootMode === 'shared'
                        ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    } ${!partyNetwork.isLeader ? 'cursor-default opacity-85' : 'cursor-pointer hover:border-emerald-500/60'}`}
                  >
                    <span className="text-[11px] font-bold">Igualitário</span>
                    <span className="text-[9px] text-zinc-400">Dividido p/ todos</span>
                  </button>

                  <button
                    disabled={!partyNetwork.isLeader}
                    onClick={() => partyNetwork.setLootMode('free_for_all')}
                    className={`p-2 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                      partyState.lootMode === 'free_for_all'
                        ? 'bg-amber-600/30 border border-amber-500 text-amber-300 font-bold'
                        : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    } ${!partyNetwork.isLeader ? 'cursor-default opacity-85' : 'cursor-pointer hover:border-amber-500/60'}`}
                  >
                    <span className="text-[11px] font-bold">Cada um por si</span>
                    <span className="text-[9px] text-zinc-400">Loot individual</span>
                  </button>

                  <button
                    disabled={!partyNetwork.isLeader}
                    onClick={() => partyNetwork.setLootMode('leader_priority')}
                    className={`p-2 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                      partyState.lootMode === 'leader_priority'
                        ? 'bg-purple-600/30 border border-purple-500 text-purple-300 font-bold'
                        : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    } ${!partyNetwork.isLeader ? 'cursor-default opacity-85' : 'cursor-pointer hover:border-purple-500/60'}`}
                  >
                    <span className="text-[11px] font-bold">Líder Prioritário</span>
                    <span className="text-[9px] text-zinc-400">Drops ao líder</span>
                  </button>
                </div>

                {/* Experience Sharing & Synergy */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-zinc-200">Experiência Compartilhada (Shared XP)</span>
                    </div>
                    {partyNetwork.isLeader ? (
                      <button
                        onClick={() => partyNetwork.setExperienceSharing(!partyState.experienceSharing)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          partyState.experienceSharing
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {partyState.experienceSharing ? 'ATIVADO' : 'DESATIVADO'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400">
                        {partyState.experienceSharing ? 'ATIVADO' : 'DESATIVADO'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-zinc-950/70 p-2 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-1 text-zinc-300">
                      <span>Bônus de Sinergia:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        +{partyState.sharedExpBonusPercent || 20}% EXP
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {partyState.members.length} {partyState.members.length === 1 ? 'membro' : 'membros'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Sinergia Tibiana: convide vocações diferentes (Knight, Paladin, Sorcerer, Druid) para elevar o bônus de 20% até 60% de EXP!
                  </p>
                </div>
              </div>

              {/* Members List */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">
                    Membros do Grupo ({partyState.members.length}/4):
                  </span>
                  <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Liderança Automática Ativa</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {partyState.members.map((member) => {
                    const isMe = member.id === character.id;
                    const hpPercent = member.maxHp ? Math.min(100, Math.max(0, (member.hp / member.maxHp) * 100)) : 100;
                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isMe
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-zinc-900/60 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                            {member.vocation.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white">
                                {member.name} {isMe && <span className="text-emerald-400 font-normal">(Você)</span>}
                              </span>
                              {member.isLeader && (
                                <span title="Líder do Grupo" className="inline-flex">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              Nível {member.level} &bull; {member.vocation}
                            </span>
                          </div>
                        </div>

                        {/* Health & Map Location */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-20 sm:w-24 h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 relative">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                            <MapPin className="w-2.5 h-2.5 text-amber-400" />
                            <span className="truncate max-w-[100px]">{member.currentMapId || 'HUB_THAIS'}</span>
                            {member.floorNumber && member.floorNumber > 1 && (
                              <span className="text-amber-400 font-bold">B{member.floorNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Party Button */}
              <button
                onClick={handleLeaveParty}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-950/80 hover:bg-red-900/90 border border-red-500/40 text-red-200 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair do Grupo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
