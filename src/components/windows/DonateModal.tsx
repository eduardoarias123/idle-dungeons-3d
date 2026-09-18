import React, { useState } from 'react';
import { Heart, Copy, Check, QrCode, Crown, Clock } from 'lucide-react';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [copiedPix, setCopiedPix] = useState(false);

  if (!isOpen) return null;

  const pixKey = 'doacoes@tibia-arpg-testserver.com.br';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-zinc-950 to-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Heart className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Apoie o Servidor
              </h2>
              <p className="text-xs text-zinc-400">Ajude a custear a hospedagem paga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Se você gosta do projeto e quer ajudar a manter o servidor de testes online até migrarmos para uma hospedagem paga decente, qualquer contribuição via PIX é muito bem-vinda!
          </p>

          {/* Pix Donation Section */}
          <div className="bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-950 border border-amber-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Chave PIX</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl p-3">
              <input
                type="text"
                readOnly
                value={pixKey}
                className="bg-transparent text-xs font-mono text-amber-300 w-full outline-none select-all"
              />
              <button
                onClick={handleCopyPix}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md"
              >
                {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* VIP / Premium System (Hold / Oficial Launch) */}
          <div className="bg-zinc-900/40 border border-amber-500/20 rounded-xl p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] text-amber-400 font-mono">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Em Espera (Hold)</span>
            </div>

            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Sistema VIP / Premium</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              O sistema automatizado de benefícios VIP/Premium está temporariamente em modo de espera e <strong className="text-amber-300">só entrará em funcionamento no Lançamento Oficial</strong> do servidor.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] text-zinc-300">
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center gap-2 opacity-75">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Tag VIP [SUPORTER] no Chat</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center gap-2 opacity-75">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Bônus de EXP & Loot Oficial</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
