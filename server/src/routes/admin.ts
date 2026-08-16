import { Router } from 'express';

import { transaction } from '../database/connection.js';
import { repositoryFor, tableOrder } from '../database/repositories.js';
import { clearAllTables, seedDatabase } from '../database/seed.js';
import { ValidationError } from '../http/errors.js';
import { requireObject } from '../http/params.js';
import { buildSnapshot } from './snapshot.js';

export const adminRouter = Router();

/** Redefine o banco para o catálogo de demonstração. */
adminRouter.post('/seed', (_req, res) => {
  seedDatabase();
  res.json({ ok: true, snapshot: buildSnapshot() });
});

/** Apaga todos os registros, deixando o banco vazio. */
adminRouter.post('/clear', (_req, res) => {
  transaction(() => clearAllTables());
  res.json({ ok: true, snapshot: buildSnapshot() });
});

/** Backup completo em JSON, no mesmo formato aceito por /restore. */
adminRouter.get('/backup', (_req, res) => {
  res.json({
    version: 2,
    exportedAt: new Date().toISOString(),
    ...buildSnapshot()
  });
});

/**
 * Restaura um backup: limpa todas as coleções e reinsere o conteúdo recebido.
 * Os ids são preservados quando vêm no arquivo.
 */
adminRouter.post('/restore', (req, res) => {
  const payload = requireObject(req.body, 'arquivo de backup');

  const hasAnyCollection = tableOrder.some((name) => Array.isArray(payload[name]));
  if (!hasAnyCollection) {
    throw new ValidationError(
      'O arquivo não contém nenhuma coleção conhecida. Verifique se é um backup do Sistemas Arka.'
    );
  }

  const imported: Record<string, number> = {};

  transaction(() => {
    clearAllTables();

    for (const name of tableOrder) {
      const rows = payload[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const repository = repositoryFor(name);
      if (!repository) continue;

      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        repository.insertPreservingId(row as Record<string, never>);
      }

      imported[name] = rows.length;
    }
  });

  res.json({ ok: true, imported, snapshot: buildSnapshot() });
});
