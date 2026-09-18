import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// ---------------------------------------------------------------------------
// ARQUIVOS QUE O VITE NÃO DEVE OBSERVAR  (correção do reload no login)
// ---------------------------------------------------------------------------
// O servidor de jogo escreve dentro de `data/` em tempo real:
//   - data/game_database.json  (save automático a cada 5s enquanto há mudanças)
//   - data/feedbacks.json
//   - data/server-errors.log e data/client-logs.log
// Como o Vite observa a raiz do projeto (ignora apenas node_modules/.git), cada
// gravação disparava um FULL RELOAD. O reload destruía o estado `isJoined` no
// cliente e o jogador voltava para a tela de seleção de personagem.
// Nada disso é código do cliente, então deve ser ignorado pelo watcher.
const WATCH_IGNORED = [
  '**/data/**', // banco de dados e logs do servidor
  '**/*.log',
  '**/*.txt', // saídas de log do terminal (ex: srv_dev_out.txt)
  '**/*.tmp', // arquivo temporário usado no save atômico do banco
  '**/dist/**', // build de produção
];

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: WATCH_IGNORED },
    },
    build: {
      // NÃO limpar dist/ antes do build: scripts/copy-assets.mjs mantém
      // dist/game-assets como espelho incremental de src/assets (~3s em vez
      // de ~40s por build). O vite só escreve index.html + assets/*, então
      // game-assets/ e server.cjs sobrevivem intactos entre builds.
      emptyOutDir: false,
    },
  };
});
