import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GameServer } from './server/gameServer';
import { db } from './server/persistence';
import { getLogFilePaths, logClientEntries, logServerError, logServerEvent, readClientLogTail } from './server/errorLogger';

// ===========================================================================
//  CAPTURA GLOBAL DE ERROS DO PROCESSO
//  Se algo estourar fora de um try/catch (tick do jogo, WebSocket, timer...)
//  o erro aparece no terminal E em data/server-errors.log.
//  O processo NÃO é encerrado: encerrar derruba o vite middleware e o browser
//  recarrega a página, exatamente o sintoma que estamos investigando.
// ===========================================================================
process.on('uncaughtException', (err) => {
  logServerError('process.uncaughtException', err, { pid: process.pid });
});

process.on('unhandledRejection', (reason) => {
  logServerError('process.unhandledRejection', reason, { pid: process.pid });
});

process.on('warning', (warning) => {
  logServerError('process.warning', warning);
});

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.xml':
      return 'application/xml';
    case '.json':
      return 'application/json';
    case '.css':
      return 'text/css';
    default:
      return 'application/octet-stream';
  }
}

async function startServer() {
  const app = express();
  // Porta: em Cloud Run / AI Studio o runtime injeta PORT. O fallback 3000 vale
  // para execução local (npm start / npm run dev).
  const PORT = Number(process.env.PORT) || 3000;
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '5mb' }));

  // Initialize Authoritative Game Server
  const gameServer = new GameServer();

  // Create HTTP Server & attach WebSocket Server
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    gameServer.handleConnection(ws);
  });

  wss.on('error', (err) => {
    logServerError('WebSocketServer.error', err);
  });

  httpServer.on('error', (err) => {
    logServerError('httpServer.error', err);
  });

  httpServer.on('clientError', (err, socket) => {
    logServerError('httpServer.clientError', err, { remoteAddress: (socket as any)?.remoteAddress });
  });

  // -------------------------------------------------------------------------
  // Sprites de itens (rota própria: NÃO usar /assets)
  // -------------------------------------------------------------------------
  // O Vite publica o bundle em /assets/index-<hash>.js|css. Os sprites usavam
  // esse mesmo prefixo, o que criava colisão de namespace. Agora tudo fica em
  // /game-assets/*:
  //   produção -> dist/game-assets (copiado por scripts/copy-assets.mjs)
  //   dev      -> src/assets       (sem cópia: arquivos sempre atualizados)
  const gameAssetsRoot = IS_PRODUCTION
    ? path.join(process.cwd(), 'dist', 'game-assets')
    : path.join(process.cwd(), 'src', 'assets');

  app.use('/game-assets', (req, res, next) => {
    const requestPath = decodeURIComponent((req.url || '').split('?')[0]);
    const filePath = path.resolve(gameAssetsRoot, `.${path.posix.normalize(requestPath)}`);

    // Guarda contra path traversal: só serve arquivos dentro de gameAssetsRoot.
    // (filePath === root acontece em GET /game-assets; nesse caso não é escape.)
    if (filePath !== gameAssetsRoot && !filePath.startsWith(gameAssetsRoot + path.sep)) {
      res.status(400).end();
      return;
    }

    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.setHeader('Content-Type', contentTypeFor(filePath));
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (err) {
      logServerError(`GET /game-assets${requestPath}`, err);
    }
    next();
  });

  // REST API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      game: 'Tibia Dungeons: 3D Idle MMORPG',
      timestamp: Date.now(),
      feedbacksCount: db.getFeedbacks().length,
    });
  });

  // -------------------------------------------------------------------------
  // Logs do navegador (erros de runtime, reload inesperado, Vite HMR, etc.)
  // Tudo que o cliente captura chega aqui e é impresso NO TERMINAL do server.
  // -------------------------------------------------------------------------
  app.post('/api/log', (req, res) => {
    try {
      const body = req.body || {};
      const entries = Array.isArray(body.entries) ? body.entries : [body];
      logClientEntries(String(body.href || 'desconhecido'), String(body.userAgent || ''), entries);
      res.json({ success: true, received: entries.length });
    } catch (err) {
      logServerError('POST /api/log', err);
      res.status(500).json({ success: false });
    }
  });

  // Últimas linhas dos logs enviados pelos navegadores (abrir no browser)
  app.get('/api/logs', (req, res) => {
    try {
      const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
      const lines = readClientLogTail(limit);
      const paths = getLogFilePaths();
      res.json({ success: true, count: lines.length, lines, files: paths });
    } catch (err) {
      logServerError('GET /api/logs', err);
      res.status(500).json({ success: false });
    }
  });

  // Diagnóstico rápido: estado atual do servidor
  app.get('/api/diagnostics', (req, res) => {
    res.json({
      success: true,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
      logFiles: getLogFilePaths(),
    });
  });

  // Playtest Feedback Submission Endpoint
  app.post('/api/feedback', (req, res) => {
    try {
      const {
        category,
        rating,
        title,
        description,
        characterName,
        vocation,
        level,
        currentMapId,
        floorNumber,
        hp,
        maxHp,
        mana,
        maxMana,
        gold,
        isAutoHunting,
        screenResolution,
        userAgent,
        recentLogs,
      } = req.body || {};

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required.' });
      }

      const feedback = {
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        category: category || 'bug',
        rating: typeof rating === 'number' ? Math.min(5, Math.max(1, rating)) : 5,
        title: String(title).slice(0, 150),
        description: String(description).slice(0, 3000),
        characterName: String(characterName || 'Anonymous').slice(0, 32),
        vocation: String(vocation || 'Unknown'),
        level: Number(level) || 1,
        currentMapId: String(currentMapId || 'HUB_THAIS'),
        floorNumber: floorNumber ? Number(floorNumber) : undefined,
        hp: Number(hp) || 0,
        maxHp: Number(maxHp) || 0,
        mana: Number(mana) || 0,
        maxMana: Number(maxMana) || 0,
        gold: Number(gold) || 0,
        isAutoHunting: Boolean(isAutoHunting),
        screenResolution: String(screenResolution || ''),
        userAgent: String(userAgent || ''),
        recentLogs: Array.isArray(recentLogs) ? recentLogs.slice(0, 20) : [],
        createdAt: Date.now(),
      };

      db.saveFeedback(feedback);
      res.json({ success: true, id: feedback.id });
    } catch (err) {
      logServerError('POST /api/feedback', err);
      res.status(500).json({ error: 'Failed to process feedback.' });
    }
  });

  // Playtest Feedbacks Listing Endpoint
  app.get('/api/feedback', (req, res) => {
    try {
      const list = db.getFeedbacks();
      res.json({ success: true, count: list.length, feedbacks: list });
    } catch (err) {
      logServerError('GET /api/feedback', err);
      res.status(500).json({ error: 'Failed to fetch feedbacks.' });
    }
  });

  // Cloud Save Endpoint (Cross-device / Browser refresh backup)
  app.post('/api/save', (req, res) => {
    try {
      const char = req.body;
      if (!char || !char.id || !char.name) {
        logServerError('POST /api/save', new Error('Payload de save inválido'), { body: char });
        return res.status(400).json({ error: 'Invalid character data' });
      }
      db.saveCharacter(char);
      res.json({ success: true, savedAt: Date.now() });
    } catch (err) {
      logServerError('POST /api/save', err);
      res.status(500).json({ error: 'Failed to save character to server' });
    }
  });

  // Cloud Load Endpoint
  app.get('/api/load', (req, res) => {
    try {
      const name = req.query.name as string;
      if (!name) {
        return res.status(400).json({ error: 'Character name is required' });
      }
      const char = db.getCharacterByName(name);
      if (!char) {
        return res.status(404).json({ error: 'Character not found on server' });
      }
      res.json({ success: true, character: char });
    } catch (err) {
      logServerError('GET /api/load', err, { name: req.query.name });
      res.status(500).json({ error: 'Failed to load character' });
    }
  });

  // Vite middleware in dev vs static serving in production
  if (!IS_PRODUCTION) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      logServerEvent('startup', 'Vite dev middleware (HMR) inicializado.');
    } catch (err) {
      logServerError('createViteServer', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Guarda de erro global do Express: qualquer erro não tratado em rota é logado
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logServerError(`express:${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Erro interno do servidor (ver data/server-errors.log)' });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tibia Dungeons] Server running on http://0.0.0.0:${PORT}`);
    logServerEvent('startup', `Servidor no ar em http://0.0.0.0:${PORT}`, getLogFilePaths());
    console.log('[Tibia Dungeons] Logs/erros do NAVEGADOR chegam via POST /api/log -> data/client-logs.log');
    console.log(`[Tibia Dungeons] Ver últimos logs do cliente em http://localhost:${PORT}/api/logs?limit=200`);
  });
}

startServer().catch((err) => {
  logServerError('startServer', err);
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
