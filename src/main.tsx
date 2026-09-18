import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalLogging, logger } from './utils/logger';

// IMPORTANTE: instala a captura global de erros ANTES de qualquer render.
// Qualquer erro (inclusive os que causam o reload da página) fica registrado.
installGlobalLogging();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

logger.event('main', 'Aplicação React montada com sucesso (createRoot).');
