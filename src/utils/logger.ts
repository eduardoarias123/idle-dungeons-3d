/**
 * ============================================================================
 *  GLOBAL CLIENT LOGGER / CRASH REPORTER
 * ============================================================================
 *  Objetivo: capturar QUALQUER erro que aconteça no cliente (browser) e
 *  descobrir por que a página está recarregando sozinha ao logar o personagem.
 *
 *  O que ele captura:
 *   - window.onerror (erros JS não tratados)
 *   - window 'error' em fase de captura (inclui falha ao carregar recursos)
 *   - 'unhandledrejection' (Promises rejeitadas sem catch)
 *   - console.error / console.warn (interceptados, sem quebrar o console)
 *   - Eventos internos do Vite: 'vite:beforeFullReload' (causa clássica de
 *     reload automático em dev), 'vite:error' e 'vite:invalidate'
 *   - Ciclo de vida da página: beforeunload, pagehide, pageshow, visibilitychange
 *   - Reload inesperado (comparando boot anterior x boot atual + heartbeat)
 *
 *  Onde os logs ficam:
 *   - console do navegador (prefixo [Tibia])
 *   - localStorage ('tibia_dungeons_log_buffer') -> SOBREVIVE ao reload
 *   - servidor via POST /api/log -> aparece no TERMINAL do dev server
 *
 *  Utilidades no console do navegador:
 *   window.tibiaDumpLogs()   -> imprime todos os logs capturados
 *   window.tibiaLogs()       -> retorna o array de logs
 *   window.tibiaClearLogs()  -> limpa o buffer
 * ============================================================================
 */

export type LogLevel = 'error' | 'warn' | 'event' | 'info';

export interface LogEntry {
  id: string;
  timestamp: number;
  bootId: string;
  level: LogLevel;
  source: string;
  message: string;
  stack?: string;
  data?: string;
}

const BUFFER_KEY = 'tibia_dungeons_log_buffer';
const BOOT_COUNT_KEY = 'tibia_dungeons_boot_count';
const HEARTBEAT_KEY = 'tibia_dungeons_last_heartbeat';
const CLEAN_UNLOAD_KEY = 'tibia_dungeons_clean_unload';

const MAX_BUFFER = 300;
const MAX_SEND_BATCH = 30;
const FLUSH_DELAY_MS = 1200;
const HEARTBEAT_MS = 5000;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let bootId = 'boot';
let bootCount = 1;
let unexpectedReload = false;
let unexpectedReloadReason = '';
let installed = false;
let flushTimer: number | null = null;
let heartbeatTimer: number | null = null;
let sendQueue: LogEntry[] = [];
let dispatchDepth = 0;

// ---------------------------------------------------------------------------
// Helpers blindados: o logger nunca pode lançar exceção
// ---------------------------------------------------------------------------

function safeStringify(value: unknown): string {
  try {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    const seen = new WeakSet<object>();
    const json = JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack };
      }
      return val;
    });
    return json === undefined ? String(value) : json;
  } catch {
    try {
      return String(value);
    } catch {
      return '[valor não serializável]';
    }
  }
}

function describeError(err: unknown): { message: string; stack?: string } {
  if (!err) return { message: 'erro desconhecido (valor vazio)' };
  if (err instanceof Error) {
    return { message: `${err.name}: ${err.message}`, stack: err.stack };
  }
  if (typeof err === 'string') return { message: err };
  try {
    const anyErr = err as any;
    if (anyErr && typeof anyErr === 'object' && ('message' in anyErr || 'stack' in anyErr)) {
      return { message: String(anyErr.message || safeStringify(err)), stack: anyErr.stack };
    }
  } catch {
    /* ignore */
  }
  return { message: safeStringify(err) };
}

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function readBuffer(): LogEntry[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(entries: LogEntry[]): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(entries.slice(-MAX_BUFFER)));
  } catch {
    /* localStorage cheio/indisponível: ignora */
  }
}

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Core: registrar entradas
// ---------------------------------------------------------------------------

function consolePrefix(level: LogLevel): string {
  switch (level) {
    case 'error':
      return '🔴 [Tibia:ERROR]';
    case 'warn':
      return '🟡 [Tibia:WARN]';
    case 'event':
      return '🔵 [Tibia:EVENT]';
    default:
      return '⚪ [Tibia:INFO]';
  }
}

function printToConsole(entry: LogEntry): void {
  // dispatchDepth evita loop infinito quando o console.error é interceptado
  dispatchDepth++;
  try {
    const native = entry.level === 'error' ? nativeConsoleError : nativeConsoleLog;
    native.call(
      console,
      `${consolePrefix(entry.level)} [${nowIso()}] [${entry.source}] ${entry.message}`,
      entry.data ?? ''
    );
    if (entry.stack) {
      native.call(console, entry.stack);
    }
  } catch {
    /* ignore */
  } finally {
    dispatchDepth--;
  }
}

function baseEntry(level: LogLevel, source: string, message: string, data?: unknown, stack?: string): LogEntry {
  return {
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    bootId,
    level,
    source,
    message,
    stack,
    data: data === undefined ? undefined : safeStringify(data),
  };
}

function pushEntry(entry: LogEntry, echoToConsole = true): void {
  if (echoToConsole) printToConsole(entry);

  const buffer = readBuffer();
  buffer.push(entry);
  writeBuffer(buffer);

  // Só envia ao servidor o que é relevante (evita flood de 'info')
  if (entry.level !== 'info') {
    sendQueue.push(entry);
    if (sendQueue.length >= MAX_SEND_BATCH) {
      flushToServer(false);
    } else {
      scheduleFlush();
    }
  }
}

// ---------------------------------------------------------------------------
// Envio para o servidor (aparece no TERMINAL do dev server)
// ---------------------------------------------------------------------------

function scheduleFlush(): void {
  if (!isBrowser || flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushToServer(false);
  }, FLUSH_DELAY_MS) as unknown as number;
}

function flushToServer(synchronous: boolean): void {
  if (!isBrowser || sendQueue.length === 0) return;
  const batch = sendQueue.slice(-MAX_SEND_BATCH);
  sendQueue = [];
  try {
    const payload = JSON.stringify({
      href: window.location.href,
      userAgent: navigator.userAgent,
      entries: batch,
    });
    if (synchronous && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/log', blob)) return;
    }
    void fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* servidor offline: o log já está no console e no localStorage */
    });
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Interceptação do console (instalada antes de qualquer outro código rodar)
// ---------------------------------------------------------------------------

const nativeConsoleLog = console.log.bind(console);
const nativeConsoleWarn = console.warn.bind(console);
const nativeConsoleError = console.error.bind(console);

function installConsoleCapture(): void {
  if (!isBrowser) return;

  console.error = (...args: unknown[]) => {
    nativeConsoleError(...args);
    if (dispatchDepth > 0) return;
    const described = args.length > 0 ? describeError(args[0]) : { message: 'console.error vazio' };
    const extra = args.length > 1 ? args.slice(1) : undefined;
    pushEntry(baseEntry('error', 'console.error', described.message, extra, described.stack), false);
  };

  console.warn = (...args: unknown[]) => {
    nativeConsoleWarn(...args);
    if (dispatchDepth > 0) return;
    const described = args.length > 0 ? describeError(args[0]) : { message: 'console.warn vazio' };
    const extra = args.length > 1 ? args.slice(1) : undefined;
    pushEntry(baseEntry('warn', 'console.warn', described.message, extra), false);
  };

  flushToServer(false); // garante que a fila inicial seja enviada
}

// ---------------------------------------------------------------------------
// API pública usada pelo resto do código do jogo
// ---------------------------------------------------------------------------

export const logger = {
  /** Erro genérico (sem stack). */
  error(source: string, message: string, data?: unknown): void {
    const described = describeError(data);
    pushEntry(baseEntry('error', source, `${message}${data !== undefined ? ` -> ${described.message}` : ''}`, data, described.stack));
  },

  /** Loga uma exceção real dentro de um catch (preserva stack). */
  exception(source: string, message: string, err: unknown, extra?: unknown): void {
    const described = describeError(err);
    pushEntry(baseEntry('error', source, `${message} -> ${described.message}`, extra, described.stack));
  },

  warn(source: string, message: string, data?: unknown): void {
    pushEntry(baseEntry('warn', source, message, data));
  },

  /** Evento importante do fluxo do jogo (é enviado ao servidor). */
  event(source: string, message: string, data?: unknown): void {
    pushEntry(baseEntry('event', source, message, data));
  },

  /** Detalhe local (NÃO é enviado ao servidor, só fica no buffer). */
  info(source: string, message: string, data?: unknown): void {
    pushEntry(baseEntry('info', source, message, data));
  },

  getLogs(): LogEntry[] {
    return readBuffer();
  },

  getLogText(): string {
    return readBuffer()
      .map(
        (e) =>
          `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.level.toUpperCase()} (${e.source}) ${e.message}` +
          (e.data ? ` | ${e.data}` : '') +
          (e.stack ? `\n${e.stack}` : '')
      )
      .join('\n');
  },

  /** Imprime tudo no console de forma legível (funciona depois do reload). */
  dump(): void {
    const logs = readBuffer();
    dispatchDepth++;
    try {
      console.groupCollapsed(`🧾 [Tibia] ${logs.length} entradas de log capturadas`);
      for (const e of logs) {
        const line = `[${new Date(e.timestamp).toLocaleTimeString()}] (${e.source}) ${e.message}`;
        if (e.level === 'error') nativeConsoleError.call(console, line, e.data ?? '', e.stack ?? '');
        else if (e.level === 'warn') nativeConsoleWarn.call(console, line, e.data ?? '');
        else nativeConsoleLog.call(console, line, e.data ?? '');
      }
      console.groupEnd();
    } catch {
      /* ignore */
    } finally {
      dispatchDepth--;
    }
  },

  clear(): void {
    writeBuffer([]);
    sendQueue = [];
    printToConsole(baseEntry('event', 'Logger', 'Buffer de logs limpo pelo usuário.'));
  },
};

// ---------------------------------------------------------------------------
// Detecção de reload inesperado (sintoma: "a página atualiza sozinha")
// ---------------------------------------------------------------------------

function detectReloadCause(): void {
  let navType = 'unknown';
  try {
    const navEntries = performance.getEntriesByType?.('navigation') || [];
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.type) navType = nav.type;
  } catch {
    /* ignore */
  }

  let previousBoot = 0;
  try {
    previousBoot = Number(safeSessionGet(BOOT_COUNT_KEY) || '0') || 0;
  } catch {
    previousBoot = 0;
  }
  bootCount = previousBoot + 1;
  safeSessionSet(BOOT_COUNT_KEY, String(bootCount));

  let lastHeartbeat = 0;
  try {
    lastHeartbeat = Number(window.localStorage.getItem(HEARTBEAT_KEY) || '0') || 0;
  } catch {
    lastHeartbeat = 0;
  }
  const msSinceHeartbeat = lastHeartbeat > 0 ? Date.now() - lastHeartbeat : -1;
  const cleanUnload = safeSessionGet(CLEAN_UNLOAD_KEY) === 'true';
  safeSessionSet(CLEAN_UNLOAD_KEY, 'false');

  // Regras: navegação do tipo 'reload' OU segundo boot na aba sem unload limpo
  unexpectedReload = navType === 'reload' || (bootCount > 1 && !cleanUnload);
  unexpectedReloadReason = [
    `tipoNavegacao=${navType}`,
    `bootNumero=${bootCount}`,
    `unloadLimpo=${cleanUnload}`,
    `msDesdeUltimoHeartbeat=${msSinceHeartbeat}`,
  ].join(', ');
}

// ---------------------------------------------------------------------------
// Instalação global
// ---------------------------------------------------------------------------

export function installGlobalLogging(): void {
  if (!isBrowser) return;
  // Evita reinstalação dupla (StrictMode / HMR re-executando o módulo)
  if (installed || (window as any).__tibiaLoggerInstalled) return;
  installed = true;
  (window as any).__tibiaLoggerInstalled = true;

  bootId = `boot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  detectReloadCause();
  installConsoleCapture();

  // --- 1. Erros JS não tratados -------------------------------------------
  window.onerror = (message, source, lineno, colno, error) => {
    const described = describeError(error);
    pushEntry(
      baseEntry(
        'error',
        'window.onerror',
        `${String(message)} @ ${String(source)}:${lineno}:${colno}`,
        { lineno, colno },
        described.stack
      )
    );
    return false; // não impede o comportamento padrão do browser
  };

  // `true` = fase de captura: também pega falhas de carregamento de recursos
  window.addEventListener(
    'error',
    (event: Event) => {
      const anyEvent = event as any;
      const target = anyEvent?.target;
      const isResourceError = target && target !== window && (target.src || target.href);
      if (isResourceError) {
        pushEntry(
          baseEntry('warn', 'resource.error', `Falha ao carregar recurso: ${target.src || target.href}`, {
            tag: target.tagName,
          })
        );
        return;
      }
      if (anyEvent?.error || anyEvent?.message) {
        const described = describeError(anyEvent.error || anyEvent.message);
        pushEntry(
          baseEntry('error', 'window:error', described.message || 'Erro sem mensagem', undefined, described.stack)
        );
      }
    },
    true
  );

  // --- 2. Promises rejeitadas sem catch -----------------------------------
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const described = describeError(event.reason);
    pushEntry(
      baseEntry('error', 'unhandledrejection', described.message, { reason: event.reason }, described.stack)
    );
  });

  // --- 3. Ciclo de vida da página (ajuda a saber QUEM recarregou) ---------
  window.addEventListener('beforeunload', () => {
    safeSessionSet(CLEAN_UNLOAD_KEY, 'true');
    pushEntry(
      baseEntry('event', 'lifecycle', 'beforeunload disparado (a página vai descarregar).', {
        href: window.location.href,
      })
    );
    flushToServer(true);
  });

  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    pushEntry(baseEntry('event', 'lifecycle', `pagehide disparado (persisted=${Boolean(event.persisted)}).`));
    flushToServer(true);
  });

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    pushEntry(baseEntry('event', 'lifecycle', `pageshow disparado (persisted=${Boolean(event.persisted)}).`));
  });

  document.addEventListener('visibilitychange', () => {
    pushEntry(baseEntry('info', 'lifecycle', `visibilitychange -> ${document.visibilityState}`));
  });

  // --- 4. Eventos internos do Vite (causa clássica de reload sozinho) -----
  try {
    const hot = (import.meta as any).hot;
    if (hot) {
      hot.on('vite:beforeFullReload', (payload: unknown) => {
        pushEntry(baseEntry('event', 'vite', '⚠️ Vite disparou FULL RELOAD na página! (motivo abaixo)', payload));
        flushToServer(true);
      });
      hot.on('vite:error', (payload: unknown) => {
        pushEntry(baseEntry('error', 'vite', 'Vite reportou erro de módulo/HMR.', payload));
      });
      hot.on('vite:invalidate', (payload: unknown) => {
        pushEntry(baseEntry('event', 'vite', 'Vite invalidou módulos (HMR update).', payload));
      });
      pushEntry(baseEntry('info', 'vite', 'HMR (vite client) ativo nesta página.'));
    } else {
      pushEntry(baseEntry('info', 'vite', 'HMR não disponível (build de produção).'));
    }
  } catch {
    /* ignore */
  }

  // --- 5. Relatório de boot / reload inesperado ---------------------------
  const previousErrors = readBuffer().filter((e) => e.level === 'error');
  pushEntry(baseEntry('event', 'boot', `Boot #${bootCount} do cliente. ${unexpectedReloadReason}`));

  if (unexpectedReload) {
    pushEntry(
      baseEntry(
        'warn',
        'boot',
        '🔁 A PÁGINA RECARREGOU — o estado isJoined foi perdido e por isso a tela de seleção voltou.',
        {
          reason: unexpectedReloadReason,
          errosNoBootAnterior: previousErrors.length,
          ultimosErros: previousErrors.slice(-5).map((e) => `${e.source}: ${e.message}`),
        }
      )
    );
  }

  // --- 6. Heartbeat: ajuda a detectar travamento/crash da aba -------------
  heartbeatTimer = window.setInterval(() => {
    try {
      window.localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, HEARTBEAT_MS) as unknown as number;

  // --- 7. Atalhos no console ---------------------------------------------
  (window as any).tibiaLogs = () => logger.getLogs();
  (window as any).tibiaDumpLogs = () => logger.dump();
  (window as any).tibiaClearLogs = () => logger.clear();
  (window as any).__tibiaLogger = logger;

  pushEntry(
    baseEntry('event', 'logger', 'Logger global instalado. Use window.tibiaDumpLogs() para ver o histórico no console.')
  );
  flushToServer(false);
}

export default logger;

