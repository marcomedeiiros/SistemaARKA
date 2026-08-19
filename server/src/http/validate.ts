import { ValidationError } from './errors.js';
import type { TableDef } from '../database/schema.js';

/**
 * Validação de payloads de escrita no servidor.
 *
 * Nunca confie no cliente: mesmo que a interface já valide, o servidor
 * revalida antes de gravar. Campos fora do schema são ignorados pelo
 * repositório, então mass-assignment além das colunas conhecidas não ocorre.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ROLES = ['admin', 'technician', 'financial'];

/**
 * Valida o payload contra o descritor da coleção.
 * @param partial `true` em PATCH (só valida o que veio); `false` em POST/PUT.
 */
export function validateWrite(
  definition: TableDef,
  payload: Record<string, unknown>,
  partial: boolean
): void {
  for (const [column, def] of Object.entries(definition.columns)) {
    const value = payload[column];
    const present = column in payload && value !== undefined && value !== null;

    if (!present) {
      // Obrigatório apenas na criação e quando não há valor padrão no schema.
      if (!partial && def.notNull && def.fallback === undefined) {
        throw new ValidationError(`O campo "${column}" é obrigatório.`);
      }
      continue;
    }

    if ((def.type === 'int' || def.type === 'real') && !Number.isFinite(Number(value))) {
      throw new ValidationError(`O campo "${column}" precisa ser um número válido.`);
    }

    if (def.type === 'text' && typeof value === 'object') {
      throw new ValidationError(`O campo "${column}" precisa ser um texto.`);
    }
  }

  applyDomainRules(definition.name, payload, partial);
}

/** Regras de domínio específicas das coleções mais sensíveis. */
function applyDomainRules(
  table: string,
  payload: Record<string, unknown>,
  partial: boolean
): void {
  if (table === 'users') {
    if ((!partial || 'name' in payload) && !String(payload.name ?? '').trim()) {
      throw new ValidationError('O nome do usuário é obrigatório.');
    }
    if ((!partial || 'email' in payload) && !EMAIL_RE.test(String(payload.email ?? ''))) {
      throw new ValidationError('Informe um e-mail válido.');
    }
    if ('role' in payload && !USER_ROLES.includes(String(payload.role))) {
      throw new ValidationError('Perfil de acesso inválido.');
    }
  }

  if (table === 'products') {
    for (const field of ['costPrice', 'salePrice', 'currentStock', 'minStock']) {
      const value = payload[field];
      if (value !== undefined && value !== null && Number(value) < 0) {
        throw new ValidationError(`O campo "${field}" não pode ser negativo.`);
      }
    }
  }
}
