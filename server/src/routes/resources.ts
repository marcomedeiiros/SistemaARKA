import { Router } from 'express';

import { repositoryFor } from '../database/repositories.js';
import { NotFoundError } from '../http/errors.js';
import { parseId, requireArray, requireObject } from '../http/params.js';
import type { Repository } from '../database/repository.js';

export const resourcesRouter = Router();

function resolve(name: string | undefined): Repository<{ id?: number }> {
  const repository = name ? repositoryFor(name) : undefined;
  if (!repository) {
    throw new NotFoundError(`Coleção "${String(name)}" não existe.`);
  }
  return repository;
}

resourcesRouter.get('/:resource', (req, res) => {
  const repository = resolve(req.params.resource);

  const { where, equals } = req.query;
  if (typeof where === 'string' && typeof equals === 'string') {
    const value = /^-?\d+(\.\d+)?$/.test(equals) ? Number(equals) : equals;
    res.json(repository.findWhere(where, value));
    return;
  }

  res.json(repository.findAll());
});

resourcesRouter.get('/:resource/:id', (req, res) => {
  const repository = resolve(req.params.resource);
  const record = repository.findById(parseId(req.params.id));

  if (!record) throw new NotFoundError();
  res.json(record);
});

resourcesRouter.post('/:resource', (req, res) => {
  const repository = resolve(req.params.resource);
  res.status(201).json(repository.insert(requireObject(req.body)));
});

resourcesRouter.post('/:resource/bulk', (req, res) => {
  const repository = resolve(req.params.resource);
  const payloads = requireArray(req.body).map((item) => requireObject(item, 'item do array'));
  res.status(201).json(repository.insertMany(payloads));
});

/** Substituição completa do registro. */
resourcesRouter.put('/:resource/:id', (req, res) => {
  const repository = resolve(req.params.resource);
  const updated = repository.replace(parseId(req.params.id), requireObject(req.body));

  if (!updated) throw new NotFoundError();
  res.json(updated);
});

/** Atualização parcial: só os campos enviados são alterados. */
resourcesRouter.patch('/:resource/:id', (req, res) => {
  const repository = resolve(req.params.resource);
  const updated = repository.update(parseId(req.params.id), requireObject(req.body));

  if (!updated) throw new NotFoundError();
  res.json(updated);
});

resourcesRouter.delete('/:resource/:id', (req, res) => {
  const repository = resolve(req.params.resource);

  if (!repository.remove(parseId(req.params.id))) {
    throw new NotFoundError();
  }

  res.status(204).end();
});
