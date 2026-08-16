import type { Repository } from '../database/repository.js';

/**
 * Gera o próximo código sequencial de um documento (ex: "Venda #000007").
 *
 * Usa o maior sufixo numérico já existente em vez de `count() + 1`, para não
 * repetir códigos depois que algum registro é excluído.
 */
export function nextSequentialCode<T extends { id?: number; code?: string }>(
  repository: Repository<T>,
  prefix: string
): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}\\s*#?(\\d+)$`, 'i');

  let highest = 0;
  for (const record of repository.findAll()) {
    const match = record.code?.trim().match(pattern);
    if (!match) continue;
    highest = Math.max(highest, Number(match[1]));
  }

  return `${prefix} #${String(highest + 1).padStart(6, '0')}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
