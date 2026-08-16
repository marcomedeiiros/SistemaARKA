import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler, notFoundHandler } from './http/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { operationsRouter } from './routes/operations.js';
import { resourcesRouter } from './routes/resources.js';
import { snapshotRouter } from './routes/snapshot.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Backups completos podem passar de 1 MB; o limite evita payloads abusivos.
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: config.databaseFile, uptime: process.uptime() });
  });

  app.use('/api/snapshot', snapshotRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/admin', adminRouter);

  // Rotas CRUD genéricas por coleção: precisam vir por último para não
  // capturar os prefixos acima como se fossem nomes de coleção.
  app.use('/api', resourcesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
