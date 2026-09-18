import React, { useState } from 'react';
import { CharacterData } from '../../types/game';
import { MAPS_DATABASE } from '../../constants/maps';
import {
  Bug,
  Scale,
  Lightbulb,
  Gauge,
  Star,
  CheckCircle2,
  Copy,
  Download,
  Send,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface FeedbackBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterData | null;
  isAutoHunting: boolean;
  floorNumber?: number;
  recentLogs?: string[];
}

type FeedbackCategory = 'bug' | 'balance' | 'suggestion' | 'performance';

export const FeedbackBugModal: React.FC<FeedbackBugModalProps> = ({
  isOpen,
  onClose,
  character,
  isAutoHunting,
  floorNumber = 1,
  recentLogs = [],
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMap = character ? MAPS_DATABASE[character.currentMapId] : null;

  const getDiagnosticsData = () => {
    return {
      category,
      rating,
      title: title.trim(),
      description: description.trim(),
      characterName: character?.name || 'Unknown',
      vocation: character?.vocation || 'Unknown',
      level: character?.level || 1,
      currentMapId: character?.currentMapId || 'HUB_THAIS',
      mapName: currentMap?.name || 'Thais Temple',
      floorNumber: character?.currentMapId?.startsWith('DUNGEON') ? floorNumber : undefined,
      hp: character?.hp || 0,
      maxHp: character?.maxHp || 0,
      mana: character?.mana || 0,
      maxMana: character?.maxMana || 0,
      gold: character?.gold || 0,
      isAutoHunting,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      recentLogs: recentLogs.slice(-10),
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Por favor, preencha o título e a descrição.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = getDiagnosticsData();

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.id || 'OK');
        sounds.playLevelUp();
        // Also keep a local copy in localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('tibia_my_feedbacks') || '[]');
          stored.push({ ...payload, id: data.id });
          localStorage.setItem('tibia_my_feedbacks', JSON.stringify(stored.slice(-20)));
        } catch (_) {}
      } else {
        setErrorMessage(data.error || 'Erro ao enviar feedback ao servidor.');
      }
    } catch (err) {
      // Offline fallback: save locally and offer copy/download
      setErrorMessage(
        'Servidor indisponível no momento. Você ainda pode copiar o relatório JSON ou baixá-lo!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyJSON = () => {
    const data = getDiagnosticsData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    sounds.playCoin();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJSON = () => {
    const data = getDiagnosticsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tibia-feedback-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sounds.playCoin();
  };

  const handleReset = () => {
    setSubmitSuccess(null);
    setTitle('');
    setDescription('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-950 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-200 uppercase tracking-wider font-serif">
                Feedback & Bug Report
              </h2>
              <p className="text-[10px] text-zinc-400">Canal direto de teste fechado com os desenvolvedores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {submitSuccess ? (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-emerald-300">Feedback Enviado com Sucesso!</h3>
              <p className="text-zinc-400 max-w-sm text-[11px]">
                Muito obrigado por ajudar a testar o <span className="text-amber-300 font-semibold">Tibia Dungeons 3D</span>.
                Seu relatório foi gravado no servidor com o protocolo <code className="bg-black/60 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[10px]">{submitSuccess}</code>.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs cursor-pointer"
                >
                  Enviar Outro Relato
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black text-xs cursor-pointer"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Category Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Tipo de Relato
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      category === 'bug'
                        ? 'bg-red-950/40 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span className="font-bold text-[11px]">Bug / Falha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('balance')}
                    className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      category === 'balance'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="font-bold text-[11px]">Balanço</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('suggestion')}
                    className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      category === 'suggestion'
                        ? 'bg-sky-950/40 border-sky-500 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.2)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                    <span className="font-bold text-[11px]">Sugestão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('performance')}
                    className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      category === 'performance'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="font-bold text-[11px]">Desempenho</span>
                  </button>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-between bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2">
                <span className="text-[11px] text-zinc-300 font-medium">Como está sua experiência de jogo geral?</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Título Resumido
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Monstro não dropou loot / Magia exori não causou dano..."
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Detalhes do Ocorrido ou Ideia
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva com detalhes o que aconteceu, o que você estava fazendo no momento ou qual sua sugestão de melhoria..."
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              {/* Auto Diagnostics Capsule */}
              <div className="bg-black/50 border border-white/5 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  <span>Diagnóstico Anexado Automaticamente</span>
                  <span className="text-emerald-400 font-mono">100% SEGURO</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-zinc-300">
                  <div className="bg-zinc-900/60 p-1.5 rounded border border-white/5">
                    <span className="text-zinc-500 block text-[9px]">HERÓI:</span>
                    <span className="font-bold truncate text-amber-300">{character?.name || 'Aventureiro'}</span>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded border border-white/5">
                    <span className="text-zinc-500 block text-[9px]">VOC/LVL:</span>
                    <span className="font-bold text-sky-300">
                      {character?.vocation} (Lv.{character?.level})
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded border border-white/5">
                    <span className="text-zinc-500 block text-[9px]">MAPA:</span>
                    <span className="font-bold text-emerald-300 truncate">
                      {currentMap?.name || 'Thais'}
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded border border-white/5">
                    <span className="text-zinc-500 block text-[9px]">CAVEBOT:</span>
                    <span className={`font-bold ${isAutoHunting ? 'text-orange-400' : 'text-zinc-400'}`}>
                      {isAutoHunting ? 'ATIVO' : 'MANUAL'}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 flex items-center gap-2 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Relatório'}</span>
                </button>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    className="flex-1 sm:flex-initial p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                    title="Copiar relatório em formato JSON"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Baixar arquivo de diagnóstico"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
