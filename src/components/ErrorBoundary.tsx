import React from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: string;
}

/**
 * Captura qualquer exceção lançada durante o render dos componentes React.
 * Sem isso o React desmonta a árvore silenciosamente e a tela parece "voltar"
 * para o estado inicial (ex: seleção de personagem).
 *
 * Obs: o projeto não possui @types/react instalado, então os membros herdados de
 * React.Component (props/state/setState) são declarados aqui apenas para o TS.
 * Em runtime quem fornece esses membros é o próprio React.
 */
export class ErrorBoundary extends React.Component {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;
  declare setState: (nextState: Partial<ErrorBoundaryState>) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.exception('ReactErrorBoundary', 'Exceção durante o render do React', error, {
      componentStack: errorInfo?.componentStack,
    });
    this.setState({ info: String(errorInfo?.componentStack || '') });
  }

  private handleCopy = () => {
    try {
      const text = `${this.state.error?.stack || this.state.error?.message || 'sem erro'}\n\nComponent stack:\n${this.state.info}\n\n--- LOGS ---\n${logger.getLogText()}`;
      void navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-6 text-slate-200 font-mono overflow-auto">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h1 className="text-red-400 font-bold text-xl">Crash de Render (React)</h1>
          </div>
          <div className="bg-black/60 border border-red-500/40 rounded p-4 text-xs whitespace-pre-wrap mb-4">
            {String(this.state.error?.message)}
            {'\n\n'}
            {String(this.state.error?.stack || '')}
            {this.state.info ? `\n\nComponent stack:\n${this.state.info}` : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.handleCopy}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Copiar erro + logs
            </button>
            <button
              onClick={() => {
                logger.dump();
                window.location.reload();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded cursor-pointer text-xs"
            >
              Recarregar página
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">
            Todos os detalhes foram enviados para o terminal do servidor (POST /api/log) e salvos em localStorage.
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
