import React, { useState } from 'react';
import { CharacterData } from '../../types/game';
import { gameSocket } from '../../game-client/network/GameSocket';
import {
  Save,
  Cloud,
  Download,
  Upload,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface SaveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterData | null;
}

export const SaveBackupModal: React.FC<SaveBackupModalProps> = ({
  isOpen,
  onClose,
  character,
}) => {
  const [importCode, setImportCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !character) return null;

  const handleForceSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const ok = await gameSocket.forceSave();
      sounds.playCoin();
      setStatusMessage({
        type: 'success',
        text: ok
          ? 'Personagem salvo localmente e sincronizado na nuvem com sucesso!'
          : 'Salvo localmente no navegador! (Servidor offline ou aguardando conexão)',
      });
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Erro ao sincronizar com o servidor.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCopy = () => {
    try {
      const json = JSON.stringify(character, null, 2);
      navigator.clipboard.writeText(json);
      setCopied(true);
      sounds.playCoin();
      setTimeout(() => setCopied(false), 2500);
      setStatusMessage({ type: 'success', text: 'Código do Save copiado para a área de transferência!' });
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Erro ao copiar save.' });
    }
  };

  const handleExportDownload = () => {
    try {
      const json = JSON.stringify(character, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tibia-save-${character.name.toLowerCase()}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sounds.playCoin();
      setStatusMessage({ type: 'success', text: 'Arquivo de save baixado com sucesso!' });
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Erro ao baixar arquivo de save.' });
    }
  };

  const handleImport = () => {
    if (!importCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Cole o código ou JSON do save para importar.' });
      return;
    }

    try {
      const parsed = JSON.parse(importCode.trim());
      if (!parsed.name || !parsed.vocation || !parsed.level) {
        throw new Error('Formato de save inválido');
      }

      const success = gameSocket.importSave(parsed);
      if (success) {
        sounds.playLevelUp();
        setStatusMessage({ type: 'success', text: `Save de "${parsed.name}" importado com sucesso!` });
        setImportCode('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: 'Não foi possível restaurar os dados do save.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Código inválido! Certifique-se de que é um JSON de save válido.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportCode(content);
        try {
          const parsed = JSON.parse(content);
          if (parsed.name) {
            setStatusMessage({ type: 'success', text: `Arquivo "${file.name}" carregado. Clique em "Restaurar Save".` });
          }
        } catch (_) {
          setStatusMessage({ type: 'error', text: 'O arquivo selecionado não contém um JSON válido.' });
        }
      }
    };
    reader.readAsText(file);
  };

  const lastSavedFormatted = character.lastSavedAt
    ? new Date(character.lastSavedAt).toLocaleTimeString()
    : 'Agora';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-emerald-200 uppercase tracking-wider font-serif">
                Gerenciador de Save & Nuvem
              </h2>
              <p className="text-[10px] text-zinc-400">Persistência segura e backup do seu progresso</p>
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
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3.5 text-xs">
          {/* Character Status Card */}
          <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300">
                Lv.{character.level}
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">{character.name}</h3>
                <span className="text-[11px] text-zinc-400 uppercase font-mono">
                  {character.vocation} &bull; {character.gold.toLocaleString()} Gold
                </span>
              </div>
            </div>

            <div className="text-right font-mono text-[10px] text-zinc-400">
              <span className="block text-emerald-400 font-bold flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3 h-3" /> Auto-Save Ativo
              </span>
              <span>Último: {lastSavedFormatted}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleForceSave}
              disabled={isSaving}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Agora'}</span>
            </button>

            <button
              onClick={handleExportDownload}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Baixar Arquivo .json</span>
            </button>
          </div>

          <button
            onClick={handleExportCopy}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer text-xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>{copied ? 'Código do Save Copiado!' : 'Copiar Save para Área de Transferência'}</span>
          </button>

          {/* Import Section */}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Importar ou Restaurar Save
              </label>
              <label className="text-[10px] text-amber-400 hover:underline cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Carregar arquivo</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="Cole o código JSON do seu save aqui para restaurá-lo..."
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />

            <button
              onClick={handleImport}
              className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-emerald-950/80 hover:border-emerald-500 border border-white/10 text-zinc-200 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar Save</span>
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
