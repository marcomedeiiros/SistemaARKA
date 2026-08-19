import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { requireAdmin, requireAuth } from './http/auth.js';
import { errorHandler, notFoundHandler } from './http/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { operationsRouter } from './routes/operations.js';
import { resourcesRouter } from './routes/resources.js';
import { snapshotRouter } from './routes/snapshot.js';
import { initAuth } from './services/auth.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Prepara a tabela de sessões antes de aceitar requisições.
  initAuth();

  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Backups completos podem passar de 1 MB; o limite evita payloads abusivos.
  app.use(express.json({ limit: '25mb' }));

  // Rotas públicas: health check e autenticação (login/cadastro).
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: config.databaseFile, uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);

  // A partir daqui, tudo exige um token de sessão válido. A identidade e o
  // perfil vêm sempre do token validado, nunca de dados enviados pelo cliente.
  app.use('/api/snapshot', requireAuth, snapshotRouter);
  app.use('/api/operations', requireAuth, operationsRouter);

  // Operações administrativas (seed, limpeza, backup, restauração) exigem admin.
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

  // Rotas CRUD genéricas por coleção: precisam vir por último para não
  // capturar os prefixos acima como se fossem nomes de coleção.
  app.use('/api', requireAuth, resourcesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
