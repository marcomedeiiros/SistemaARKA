import { Router } from 'express';

import { repositoryFor } from '../database/repositories.js';
import { tables } from '../database/schema.js';
import { ForbiddenError, NotFoundError } from '../http/errors.js';
import { parseId, requireArray, requireObject } from '../http/params.js';
import { canWriteCollection } from '../http/policy.js';
import { validateWrite } from '../http/validate.js';
import { destroySessionsForUser, hashPassword, toPublicUser } from '../services/auth.js';
import type { Repository } from '../database/repository.js';
import type { TableDef } from '../database/schema.js';
import type { User, UserRole } from '../types.js';

export const resourcesRouter = Router();

const definitionByName = new Map<string, TableDef>(tables.map((table) => [table.name, table]));

function resolve(name: string | undefined): {
  repository: Repository<{ id?: number }>;
  definition: TableDef;
} {
  const repository = name ? repositoryFor(name) : undefined;
  const definition = name ? definitionByName.get(name) : undefined;
  if (!repository || !definition) {
    throw new NotFoundError(`Coleção "${String(name)}" não existe.`);
  }
  return { repository, definition };
}

/**
 * Autorização de escrita por coleção, baseada no perfil do token validado
 * (política central em http/policy.ts). A decisão acontece no servidor o
 * cliente não tem como escalar.
 */
function assertCanWrite(role: UserRole, resource: string): void {
  if (!canWriteCollection(role, resource)) {
    throw new ForbiddenError('Seu perfil não permite alterar esta coleção.');
  }
}

/** Remove o campo `password` das respostas da coleção de usuários. */
function sanitize(resource: string, record: unknown): unknown {
  if (resource === 'users' && record && typeof record === 'object') {
    return toPublicUser(record as User);
  }
  return record;
}

/**
 * Prepara o payload de escrita de usuários:
 * - senha nova (não vazia) é convertida em hash;
 * - sem senha, a existente é preservada (evita zerar a senha num PUT, já que o
 *   cliente nunca recebe o campo `password` no snapshot).
 */
function prepareUserWrite(
  id: number | null,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...payload };
  const raw = next.password;

  if (typeof raw === 'string' && raw.trim() !== '') {
    next.password = hashPassword(raw);
    return next;
  }

  delete next.password;
  if (id !== null) {
    const existing = repositoryFor('users')?.findById(id) as User | undefined;
    if (existing?.password) next.password = existing.password;
  }
  return next;
}

/* ─────────────────────────── Leitura ─────────────────────────── */

resourcesRouter.get('/:resource', (req, res) => {
  const resource = req.params.resource!;
  const { repository } = resolve(resource);

  const { where, equals } = req.query;
  if (typeof where === 'string' && typeof equals === 'string') {
    const value = /^-?\d+(\.\d+)?$/.test(equals) ? Number(equals) : equals;
    res.json(repository.findWhere(where, value).map((row) => sanitize(resource, row)));
    return;
  }

  res.json(repository.findAll().map((row) => sanitize(resource, row)));
});

resourcesRouter.get('/:resource/:id', (req, res) => {
  const resource = req.params.resource!;
  const { repository } = resolve(resource);
  const record = repository.findById(parseId(req.params.id));

  if (!record) throw new NotFoundError();
  res.json(sanitize(resource, record));
});

/* ─────────────────────────── Escrita ─────────────────────────── */

resourcesRouter.post('/:resource', (req, res) => {
  const resource = req.params.resource!;
  const { repository, definition } = resolve(resource);
  assertCanWrite(req.user!.role, resource);

  let payload = requireObject(req.body);
  validateWrite(definition, payload, false);
  if (resource === 'users') payload = prepareUserWrite(null, payload);

  res.status(201).json(sanitize(resource, repository.insert(payload)));
});

resourcesRouter.post('/:resource/bulk', (req, res) => {
  const resource = req.params.resource!;
  const { repository, definition } = resolve(resource);
  assertCanWrite(req.user!.role, resource);

  const payloads = requireArray(req.body).map((item) => {
    const obj = requireObject(item, 'item do array');
    validateWrite(definition, obj, false);
    return resource === 'users' ? prepareUserWrite(null, obj) : obj;
  });

  res.status(201).json(repository.insertMany(payloads).map((row) => sanitize(resource, row)));
});

/** Substituição completa do registro. */
resourcesRouter.put('/:resource/:id', (req, res) => {
  const resource = req.params.resource!;
  const { repository, definition } = resolve(resource);
  assertCanWrite(req.user!.role, resource);

  const id = parseId(req.params.id);
  let payload = requireObject(req.body);
  validateWrite(definition, payload, false);
  if (resource === 'users') payload = prepareUserWrite(id, payload);

  const updated = repository.replace(id, payload);
  if (!updated) throw new NotFoundError();
  res.json(sanitize(resource, updated));
});

/** Atualização parcial: só os campos enviados são alterados. */
resourcesRouter.patch('/:resource/:id', (req, res) => {
  const resource = req.params.resource!;
  const { repository, definition } = resolve(resource);
  assertCanWrite(req.user!.role, resource);

  const id = parseId(req.params.id);
  let payload = requireObject(req.body);
  validateWrite(definition, payload, true);
  if (resource === 'users') payload = prepareUserWrite(id, payload);

  const updated = repository.update(id, payload);
  if (!updated) throw new NotFoundError();
  res.json(sanitize(resource, updated));
});

resourcesRouter.delete('/:resource/:id', (req, res) => {
  const resource = req.params.resource!;
  const { repository } = resolve(resource);
  assertCanWrite(req.user!.role, resource);

  const id = parseId(req.params.id);

  // Ao remover um usuário, encerra também as sessões abertas dele.
  if (resource === 'users') destroySessionsForUser(id);

  if (!repository.remove(id)) {
    throw new NotFoundError();
  }

  res.status(204).end();
});
