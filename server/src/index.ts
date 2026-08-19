import { createApp } from './app.js';
import { config } from './config.js';
import { closeDatabase, getDatabase } from './database/connection.js';
import { ensureWindowsLicenses, isDatabaseEmpty, seedDatabase } from './database/seed.js';

function bootstrap() {
  // Abre a conexão e roda as migrações antes de aceitar requisições.
  getDatabase();

  if (config.seedOnEmpty && isDatabaseEmpty()) {
    console.log('[arka-api] banco vazio populando com os dados de demonstração...');
    seedDatabase();
  }

  // Garante o catálogo de licenças de Windows mesmo em bancos já existentes,
  // sem apagar dados. Idempotente: não faz nada se as licenças já existem.
  ensureWindowsLicenses();

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[arka-api] ouvindo em http://localhost:${config.port}`);
    console.log(`[arka-api] banco de dados: ${config.databaseFile}`);
    console.log(`[arka-api] origens liberadas: ${config.corsOrigins.join(', ')}`);
    console.warn(
      '[arka-api] atenção: a API não tem autenticação. Mantenha-a acessível apenas na rede local.'
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[arka-api] ${signal} recebido, encerrando...`);
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
