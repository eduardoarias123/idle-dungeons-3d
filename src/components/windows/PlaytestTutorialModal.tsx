import React, { useState } from 'react';
import {
  Compass,
  Swords,
  Users,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  HelpCircle,
  X,
  Keyboard,
  Sparkles,
  Bot,
  MapPin,
  Camera,
  Bug,
} from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';

interface PlaytestTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
}

export const PlaytestTutorialModal: React.FC<PlaytestTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenFeedback,
}) => {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(
    localStorage.getItem('tibia_tutorial_completed') === 'true'
  );

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('tibia_tutorial_completed', 'true');
    } else {
      localStorage.removeItem('tibia_tutorial_completed');
    }
    sounds.playLevelUp();
    onClose();
  };

  const steps = [
    {
      title: 'Passo 1: Controles, Movimentação & Câmera',
      subtitle: 'Como se movimentar e navegar no mundo 3D',
      icon: Compass,
      color: 'text-amber-400',
      bgGlow: 'from-amber-950/40',
      content: (
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-zinc-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Movimento Fluido</strong>
                <span>
                  Clique com o <b>botão esquerdo no chão</b> para andar com busca de caminho A*. Em telas móveis, use o joystick virtual no canto inferior esquerdo.
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Auto-Target Rápido</strong>
                <span>
                  Pressione a tecla <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">Espaço</kbd> a qualquer momento para focar o monstro mais próximo automaticamente.
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Câmera Isométrica ARPG</strong>
                <span>
                  Ângulo tático clássico de 56° com visão ampla. Use o <b>scroll do mouse</b> para dar zoom in/out e pressione <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-purple-300 font-mono text-[10px]">V</kbd> para alternar entre perspectiva isométrica diagonal e frontal.
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Bonecos de Treino</strong>
                <span>
                  No templo de Thais, bata nos <b>Espantalhos de Treino</b> com física de mola para subir suas habilidades (Sword, Axe, Club, Dist, Magic) sem risco de morrer!
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Passo 2: Combate, Magias & Cavebot (Auto-Hunt)',
      subtitle: 'Como conjurar feitiços, caçar sozinho e regenerar',
      icon: Swords,
      color: 'text-orange-400',
      bgGlow: 'from-orange-950/40',
      content: (
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-zinc-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Cavebot Autônomo (AUTO)</strong>
                <span>
                  Clique no botão <b className="text-orange-400">AUTO</b> no topo. Seu herói patrulha a masmorra, foca inimigos no alcance, ataca e pega moedas de ouro sozinho!
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Atalhos de Magia (1 a 6)</strong>
                <span>
                  Use <kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded text-sky-300 font-mono text-[10px]">1</kbd> para cura, <kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded text-sky-300 font-mono text-[10px]">2</kbd> para dano elemental e <kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded text-sky-300 font-mono text-[10px]">5-6</kbd> para poções rápidas de HP/Mana.
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Altar do Santuário</strong>
                <span>
                  No templo de Thais, use o botão <b className="text-emerald-400">Descansar no Altar</b> para restaurar instantaneamente 100% da sua Vida e Mana sem gastar suprimentos.
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Teclas Rápidas</strong>
                <span>
                  <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono text-[9px]">I</kbd> Mochila &bull; <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono text-[9px]">K</kbd> Atributos &bull; <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono text-[9px]">S</kbd> Magias &bull; <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono text-[9px]">M</kbd> Zonas de Caça.
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Passo 3: Dungeons Procedurais, Grupos & Feedback',
      subtitle: 'Explore andares infinitos, jogue em co-op e teste conosco',
      icon: Users,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-950/40',
      content: (
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-zinc-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Dungeons Procedurais (B1..B10)</strong>
                <span>
                  Derrote a meta de monstros de cada onda para invocar o Chefe. Ao derrotá-lo, o <b>Portal de Descida</b> se abre para você descer ao próximo andar mais desafiador!
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Grupos & Multiplayer (P)</strong>
                <span>
                  Abra a janela de <b>Grupo (Hotkey: P)</b>, crie uma sala e envie o código para seus amigos. Vocês compartilham a mesma semente da dungeon e ganham <b>+15% a +20% de EXP extra</b>!
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                <Bug className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Canal de Bugs & Sugestões</strong>
                <span>
                  Encontrou algum problema, erro de animação ou tem uma ideia de magia/monstro? Clique no ícone de <b>Bug</b> no topo ou use o botão de feedback a qualquer momento!
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/5 p-2.5 rounded-xl flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-zinc-100 block font-semibold mb-0.5">Progresso 100% Salvo</strong>
                <span>
                  Seu progresso é gravado automaticamente a cada 4 segundos no navegador e sincronizado em nuvem no servidor. Você nunca perde seu progresso!
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentStep.bgGlow} via-zinc-900 to-zinc-950 px-4 py-3 border-b border-white/10 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-black/40 border border-white/10 ${currentStep.color}`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-mono">
                  Guia do Testador &bull; {step + 1} de {steps.length}
                </span>
              </div>
              <h2 className="text-sm font-black text-zinc-100 tracking-wide">
                {currentStep.title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          <p className="text-[11px] text-zinc-400 font-medium">
            {currentStep.subtitle}
          </p>

          {currentStep.content}

          {/* Step Dots indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setStep(i);
                  sounds.playSwordSwing();
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  step === i ? 'w-6 bg-amber-400' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/60 px-4 py-3 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-black border-zinc-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Não abrir este guia automaticamente</span>
          </label>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep((p) => p - 1);
                  sounds.playSwordSwing();
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setStep((p) => p + 1);
                  sounds.playSwordSwing();
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black flex items-center gap-1 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Começar a Jogar!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
