import { ValidationError } from './errors.js';

/** Converte um parâmetro de rota em id numérico, rejeitando valores inválidos. */
export function parseId(raw: string | undefined, label = 'id'): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Parâmetro "${label}" inválido: ${String(raw)}.`);
  }
  return value;
}

/** Garante que o corpo da requisição é um objeto JSON. */
export function requireObject(body: unknown, label = 'corpo da requisição'): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError(`O ${label} precisa ser um objeto JSON.`);
  }
  return body as Record<string, unknown>;
}

/** Garante que o corpo da requisição é um array JSON. */
export function requireArray(body: unknown, label = 'corpo da requisição'): unknown[] {
  if (!Array.isArray(body)) {
    throw new ValidationError(`O ${label} precisa ser um array JSON.`);
  }
  return body;
}
