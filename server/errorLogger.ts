import fs from 'fs';
import path from 'path';

/**
 * ============================================================================
 *  LOGGER / CRASH REPORTER DO SERVIDOR
 * ============================================================================
 *  Grava qualquer erro (uncaughtException, unhandledRejection, erros de
 *  request/tick/websocket) no terminal E em arquivo, para não perdermos nada.
 *
 *  Arquivos gerados:
 *   - data/server-errors.log  -> erros do processo Node
 *   - data/client-logs.log    -> logs/erros enviados pelo navegador (POST /api/log)
 * ============================================================================
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const SERVER_ERROR_FILE = path.join(DATA_DIR, 'server-errors.log');
const CLIENT_LOG_FILE = path.join(DATA_DIR, 'client-logs.log');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB -> rotaciona

export interface ClientLogEntry {
  id?: string;
  timestamp?: number;
  bootId?: string;
  level?: string;
  source?: string;
  message?: string;
  stack?: string;
  data?: string;
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    /* ignore */
  }
}

function rotateIfNeeded(file: string): void {
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_FILE_BYTES) {
      fs.renameSync(file, `${file}.1`);
    }
  } catch {
    /* ignore */
  }
}

function appendLine(file: string, line: string): void {
  try {
    ensureDataDir();
    rotateIfNeeded(file);
    fs.appendFileSync(file, `${line}\n`, 'utf-8');
  } catch (e) {
    console.error('[ErrorLogger] Não foi possível escrever no arquivo de log:', e);
  }
}

function serializeError(err: unknown): string {
  try {
    if (err === undefined) return 'undefined';
    if (err === null) return 'null';
    if (typeof err === 'string') return err;
    const anyErr = err as any;
    if (anyErr?.stack) return `${anyErr.name || 'Error'}: ${anyErr.message}\n${anyErr.stack}`;
    if (anyErr?.message) return String(anyErr.message);
    return JSON.stringify(err);
  } catch {
    return '[erro não serializável]';
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

/** Loga um erro do processo Node/HTTP/WebSocket/tick. */
export function logServerError(context: string, err: unknown, extra?: unknown): void {
  const detail = serializeError(err);
  const line = `[${timestamp()}] 🔴 [SERVER:ERROR] [${context}] ${detail}${
    extra !== undefined ? ` | extra=${safeJson(extra)}` : ''
  }`;
  console.error(line);
  appendLine(SERVER_ERROR_FILE, line);
}

/** Loga um evento relevante do servidor (sem stack de erro). */
export function logServerEvent(context: string, message: string, extra?: unknown): void {
  const line = `[${timestamp()}] 🔵 [SERVER:EVENT] [${context}] ${message}${
    extra !== undefined ? ` | extra=${safeJson(extra)}` : ''
  }`;
  console.log(line);
  appendLine(SERVER_ERROR_FILE, line);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Imprime no terminal e grava em arquivo os logs enviados pelo navegador. */
export function logClientEntries(href: string, userAgent: string, entries: ClientLogEntry[]): void {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const blocks: string[] = [];
  for (const entry of entries) {
    const level = String(entry.level || 'info').toUpperCase();
    const icon = level === 'ERROR' ? '🔴' : level === 'WARN' ? '🟡' : '🔵';
    const head = `[${timestamp()}] ${icon} [CLIENT:${level}] [${entry.source || 'desconhecido'}] ${
      entry.message || ''
    }${entry.data ? ` | ${entry.data}` : ''}`;

    // Erros e reloads aparecem com destaque no terminal
    if (level === 'ERROR') console.error(head);
    else if (level === 'WARN') console.warn(head);
    else console.log(head);

    if (entry.stack) console.log(entry.stack);

    blocks.push(`${head}${entry.stack ? `\n${entry.stack}` : ''}`);
  }

  const footer = `    ↳ href=${href} | ua=${userAgent}`;
  console.log(footer);
  appendLine(CLIENT_LOG_FILE, `${blocks.join('\n')}\n${footer}\n---`);
}

/** Retorna as últimas linhas já gravadas dos logs de clientes (para GET /api/logs). */
export function readClientLogTail(maxLines = 200): string[] {
  try {
    if (!fs.existsSync(CLIENT_LOG_FILE)) return [];
    const raw = fs.readFileSync(CLIENT_LOG_FILE, 'utf-8');
    return raw.split('\n').filter(Boolean).slice(-maxLines);
  } catch (e) {
    logServerError('readClientLogTail', e);
    return [];
  }
}

export function getLogFilePaths(): { serverErrors: string; clientLogs: string } {
  return { serverErrors: SERVER_ERROR_FILE, clientLogs: CLIENT_LOG_FILE };
}