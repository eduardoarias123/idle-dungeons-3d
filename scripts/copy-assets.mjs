/**
 * ============================================================================
 *  COPIA DOS SPRITES PARA O BUILD DE PRODUÇÃO (INCREMENTAL)
 * ============================================================================
 *  O servidor serve os sprites de itens via rota própria `/game-assets/*`
 *  (ver `server.ts`). Em produção a raiz dessa rota é `dist/game-assets`, para
 *  que o deploy possa levar somente a pasta `dist/`.
 *
 *  Em desenvolvimento nada é copiado: o servidor lê direto de `src/assets`.
 *
 *  ESTRATÉGIA: espelho incremental em vez de apagar-e-copiar-tudo.
 *  A cada execução o script compara origem x destino por (mtimeMs + size) e:
 *    - copia arquivos novos ou modificados;
 *    - apaga do destino arquivos que sumiram da origem (espelho fiel);
 *    - pula o resto (o caso comum: builds ficam em ~1-3s em vez de ~40s).
 *  Use `node scripts/copy-assets.mjs --force` para forçar cópia total
 *  (ex.: após trocar de máquina ou suspeita de dist/ corrompido).
 * ============================================================================
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'src', 'assets');
const targetDir = path.join(projectRoot, 'dist', 'game-assets');
const FORCE_FULL = process.argv.includes('--force');

if (!fs.existsSync(sourceDir)) {
  console.error(`[copy-assets] ❌ Pasta de origem não encontrada: ${sourceDir}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(projectRoot, 'dist'))) {
  console.error('[copy-assets] ❌ Pasta dist/ não existe — rode o `vite build` antes.');
  process.exit(1);
}

const startedAt = Date.now();
let copied = 0;
let removed = 0;
let skipped = 0;

if (FORCE_FULL) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  copied = countFiles(targetDir);
} else {
  fs.mkdirSync(targetDir, { recursive: true });
  syncDir(sourceDir, targetDir);
}

/**
 * Espelha src -> dst recursivamente.
 * Compara por (mtimeMs + size); copia só o que é novo ou mudou.
 * Remove do destino o que não existe mais na origem.
 */
function syncDir(srcDir, dstDir) {
  const srcEntries = new Map();
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    srcEntries.set(entry.name, entry);
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      syncDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      if (isUpToDate(srcPath, dstPath)) {
        skipped++;
      } else {
        fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        fs.copyFileSync(srcPath, dstPath);
        // Preserva o mtime para a próxima comparação ser barata e correta.
        const st = fs.statSync(srcPath);
        fs.utimesSync(dstPath, st.atime, st.mtime);
        copied++;
      }
    }
  }
  // Espelho fiel: remove do destino o que sumiu da origem.
  for (const entry of fs.readdirSync(dstDir, { withFileTypes: true })) {
    if (!srcEntries.has(entry.name)) {
      fs.rmSync(path.join(dstDir, entry.name), { recursive: true, force: true });
      removed++;
    }
  }
}

function isUpToDate(srcPath, dstPath) {
  let dstStat;
  try {
    dstStat = fs.statSync(dstPath);
  } catch {
    return false; // não existe no destino -> copiar
  }
  if (!dstStat.isFile()) return false;
  const srcStat = fs.statSync(srcPath);
  return srcStat.size === dstStat.size && Math.abs(srcStat.mtimeMs - dstStat.mtimeMs) < 1;
}

function countFiles(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += countFiles(path.join(dir, entry.name));
    else total += 1;
  }
  return total;
}

console.log(
  `[copy-assets] ✅ espelho src/assets -> dist/game-assets em ${Date.now() - startedAt}ms ` +
    `(copiados=${copied} removidos=${removed} inalterados=${skipped}${FORCE_FULL ? ' --force' : ''})`
);
