import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do pacote server/, tanto rodando via tsx (src/) quanto compilado (dist/). */
export const serverRoot = path.resolve(here, '..');

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export const config = {
  port: Number(process.env.PORT ?? 4000),

  databaseFile: path.resolve(
    serverRoot,
    process.env.DATABASE_FILE ?? path.join('data', 'arka.db')
  ),

  /**
   * Origens liberadas no CORS. Por padrão apenas as portas locais do Vite,
   * para que a API não fique aberta à internet em desenvolvimento.
   */
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  seedOnEmpty: envFlag('SEED_ON_EMPTY', true)
};
