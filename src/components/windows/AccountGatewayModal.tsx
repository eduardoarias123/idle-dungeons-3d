import React, { useState, useEffect } from 'react';
import { VocationType, CharacterData } from '../../types/game';
import { VOCATIONS } from '../../constants/vocations';
import { Target, Wand2, Sparkles, Swords, ArrowRight, ShieldCheck, User, Lock, Mail, Key, LogOut, Plus, Play, Trash2 } from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface AccountUser {
  email: string;
  characters: CharacterData[];
}

interface AccountGatewayModalProps {
  isOpen: boolean;
  onSelectCharacter: (character: CharacterData) => void;
  onCreateNewCharacter: (name: string, vocation: VocationType, email: string) => void;
}

export const AccountGatewayModal: React.FC<AccountGatewayModalProps> = ({
  isOpen,
  onSelectCharacter,
  onCreateNewCharacter,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alphaKey, setAlphaKey] = useState('');
  const [loggedAccount, setLoggedAccount] = useState<AccountUser | null>(null);
  const [viewState, setViewState] = useState<'auth' | 'char_select' | 'char_create'>('auth');

  // Character creation form state
  const [newCharName, setNewCharName] = useState('');
  const [selectedVocation, setSelectedVocation] = useState<VocationType>('KNIGHT');

  useEffect(() => {
    // Check saved session in localStorage
    const savedEmail = localStorage.getItem('tibia_user_email');
    if (savedEmail) {
      loadAccountData(savedEmail);
    }
  }, []);

  if (!isOpen) return null;

  const loadAccountData = (userEmail: string) => {
    const accountsKey = 'tibia_accounts_db';
    const dbRaw = localStorage.getItem(accountsKey);
    let db: Record<string, CharacterData[]> = dbRaw ? JSON.parse(dbRaw) : {};

    if (!db[userEmail]) {
      // Default starter character for new account
      db[userEmail] = [];
    }

    setLoggedAccount({ email: userEmail, characters: db[userEmail] });
    setEmail(userEmail);
    setViewState('char_select');
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    sounds.playLevelUp();
    const cleanEmail = email.trim().toLowerCase();
    
    // Save session
    localStorage.setItem('tibia_user_email', cleanEmail);
    loadAccountData(cleanEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('tibia_user_email');
    setLoggedAccount(null);
    setViewState('auth');
    sounds.playSwordSwing();
  };

  const handleCreateCharacterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedAccount) return;
    const cleanName = newCharName.trim() || 'Aventurer';

    sounds.playLevelUp();
    onCreateNewCharacter(cleanName, selectedVocation, loggedAccount.email);
  };

  const vocationList: { type: VocationType; icon: any; color: string; role: string; desc: string }[] = [
    { type: 'KNIGHT', icon: Swords, color: 'text-amber-400', role: 'Tank Melee', desc: 'High HP & heavy shields' },
    { type: 'PALADIN', icon: Target, color: 'text-emerald-400', role: 'Distance', desc: 'Bows & divine holy arts' },
    { type: 'SORCERER', icon: Wand2, color: 'text-purple-400', role: 'Mage', desc: 'Fire & energy destruction' },
    { type: 'DRUID', icon: Sparkles, color: 'text-sky-400', role: 'Healer', desc: 'Ice spells & restorative healing' },
  ];

  const currentVoc = VOCATIONS[selectedVocation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="bg-[#121214] border border-amber-500/30 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/50 via-zinc-950 to-amber-950/50 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Alpha Test Server Gateway</span>
            </div>
            <h1 className="text-base font-bold text-white tracking-wide">
              {viewState === 'auth' && (authMode === 'login' ? 'Entrar na Conta' : 'Criar Nova Conta')}
              {viewState === 'char_select' && 'Seleção de Personagens'}
              {viewState === 'char_create' && 'Criar Novo Herói'}
            </h1>
          </div>

          {loggedAccount && viewState !== 'auth' && (
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-xs text-zinc-300 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Desconectar Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono">Sair</span>
            </button>
          )}
        </div>

        {/* VIEW 1: AUTHENTICATION (LOGIN / REGISTER) */}
        {viewState === 'auth' && (
          <form onSubmit={handleAuthSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/90 leading-relaxed">
              <strong>Servidor de Testes Privado:</strong> Insira seu e-mail e senha para salvar seu progresso na nuvem (Cloud Save) e acessar seus heróis em qualquer dispositivo.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>E-mail da Conta</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-medium placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Senha</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-medium placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Alpha Key (Opcional)</span>
                </label>
                <input
                  type="text"
                  value={alphaKey}
                  onChange={(e) => setAlphaKey(e.target.value)}
                  placeholder="CHAVE-TESTER-2026"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-emerald-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{authMode === 'login' ? 'Entrar na Conta' : 'Registrar Conta'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                {authMode === 'login'
                  ? 'Não tem conta? Crie uma agora de graça'
                  : 'Já tem uma conta? Faça login'}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: CHARACTER LIST / SELECT */}
        {viewState === 'char_select' && loggedAccount && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-300 font-mono">{loggedAccount.email}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase font-mono">
                Cloud Synced
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Seus Personagens ({loggedAccount.characters.length})
              </label>

              {loggedAccount.characters.length === 0 ? (
                <div className="bg-zinc-900/40 border border-dashed border-white/10 rounded-xl p-6 text-center space-y-3">
                  <p className="text-xs text-zinc-400">Nenhum herói criado nesta conta ainda.</p>
                  <button
                    onClick={() => setViewState('char_create')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Primeiro Herói</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {loggedAccount.characters.map((char) => (
                    <div
                      key={char.id}
                      className="bg-zinc-900/80 hover:bg-zinc-900 border border-white/10 hover:border-amber-500/50 rounded-xl p-3.5 flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono text-sm">
                          {char.level}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {char.name}
                          </h4>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            {char.vocation} • HP {char.hp} / MP {char.mana}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          sounds.playLevelUp();
                          onSelectCharacter(char);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-zinc-950" />
                        <span>Jogar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loggedAccount.characters.length > 0 && (
              <button
                onClick={() => setViewState('char_create')}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-amber-500/40 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Personagem</span>
              </button>
            )}
          </div>
        )}

        {/* VIEW 3: CHARACTER CREATION */}
        {viewState === 'char_create' && (
          <form onSubmit={handleCreateCharacterSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Nome do Herói
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Ex: Arthas..."
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-bold placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Escolha a Vocação
              </label>

              <div className="grid grid-cols-2 gap-2">
                {vocationList.map((v) => {
                  const Icon = v.icon;
                  const isSelected = selectedVocation === v.type;

                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => {
                        setSelectedVocation(v.type);
                        sounds.playSwordSwing();
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-black/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg bg-black/80 border border-white/10 ${v.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-white">
                            {VOCATIONS[v.type].name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-amber-400">{v.role}</span>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        {v.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats preview */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 text-[10px] uppercase">HP:</span>
                <span className="text-emerald-400 font-bold">+{currentVoc.hpPerLevel}</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 text-[10px] uppercase">MP:</span>
                <span className="text-sky-400 font-bold">+{currentVoc.manaPerLevel}</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 text-[10px] uppercase">Cap:</span>
                <span className="text-zinc-300 font-bold">+{currentVoc.capPerLevel}oz</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewState('char_select')}
                className="w-1/3 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Criar Herói</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
