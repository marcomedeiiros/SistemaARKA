import { Router } from 'express';

import { repositories } from '../database/repositories.js';
import { refreshOverdueStatus } from '../services/financial.js';
import { toPublicUser } from '../services/auth.js';
import type { Snapshot } from '../types.js';

export const snapshotRouter = Router();

/** Retrato sem dados sensíveis: remove o hash de senha da coleção de usuários. */
function toPublicSnapshot(snapshot: Snapshot): Snapshot {
  return { ...snapshot, users: snapshot.users.map((user) => toPublicUser(user)) };
}

export function buildSnapshot(): Snapshot {
  // Antes de servir os dados, promove a `vencido` os títulos com prazo estourado,
  // para que o client não precise recalcular isso em cada tela.
  refreshOverdueStatus();

  return {
    users: repositories.users.findAll(),
    customers: repositories.customers.findAll(),
    suppliers: repositories.suppliers.findAll(),
    categories: repositories.categories.findAll(),
    products: repositories.products.findAll(),
    services: repositories.services.findAll(),
    stockMovements: repositories.stockMovements.findAll(),
    sales: repositories.sales.findAll(),
    serviceOrders: repositories.serviceOrders.findAll(),
    accountsReceivable: repositories.accountsReceivable.findAll(),
    accountsPayable: repositories.accountsPayable.findAll(),
    companySettings: repositories.companySettings.findAll()
  };
}

/** Retrato do banco o client carrega isso no boot e após mutações (sem senhas). */
snapshotRouter.get('/', (_req, res) => {
  res.json(toPublicSnapshot(buildSnapshot()));
});
