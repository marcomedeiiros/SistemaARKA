import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { config } from '../config.js';
import { columnSqlType, createIndexesSql, createTableSql, tables } from './schema.js';
import type { TableDef } from './schema.js';

let instance: DatabaseSync | null = null;

/**
 * Abre (ou reaproveita) a conexão com o arquivo SQLite, criando o diretório
 * de dados e o schema na primeira chamada.
 */
export function getDatabase(): DatabaseSync {
  if (instance) return instance;

  fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

  const db = new DatabaseSync(config.databaseFile);

  // WAL melhora leituras concorrentes; foreign_keys deixa a integridade explícita.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  migrate(db);

  instance = db;
  return db;
}

/**
 * Alinha o banco com os descritores de schema. Seguro para rodar sempre:
 * cria tabelas e índices que faltam e acrescenta colunas novas às tabelas
 * que já existem.
 */
function migrate(db: DatabaseSync): void {
  for (const definition of tables) {
    db.exec(createTableSql(definition));
    addMissingColumns(db, definition);

    for (const indexSql of createIndexesSql(definition)) {
      db.exec(indexSql);
    }
  }

  migrateLegacyValues(db);
}

/**
 * Reescreve valores de enum que saíram do domínio depois de mudanças de regra
 * de negócio. Sem isso, registros antigos continuariam com status/perfis que a
 * interface não sabe mais renderizar (cairiam no badge cinza de fallback).
 *
 * Idempotente: os UPDATEs só afetam linhas que ainda tenham o valor legado.
 *
 * 1. O perfil "seller" (Vendedor) foi removido; quem vendia agora é "technician".
 * 2. Os 9 status de OS foram reduzidos a aberta / em_execucao / encerrada /
 *    cancelada. Triagem e aprovação voltam para "aberta", espera de peça
 *    continua "em_execucao", e concluída/entregue viram "encerrada".
 */
function migrateLegacyValues(db: DatabaseSync): void {
  // Os nomes físicos saem do próprio descritor (ex.: "serviceOrders" grava em
  // "service_orders"), então renomear uma tabela no schema não quebra isto.
  const physicalTable = (name: string): string => {
    const definition = tables.find((candidate) => candidate.name === name);
    if (!definition) throw new Error(`Descritor de tabela "${name}" não encontrado.`);
    return definition.table;
  };

  const remaps: { entity: string; column: string; from: string[]; to: string }[] = [
    { entity: 'users', column: 'role', from: ['seller'], to: 'technician' },
    {
      entity: 'serviceOrders',
      column: 'status',
      from: ['em_analise', 'aguardando_aprovacao', 'aprovada'],
      to: 'aberta'
    },
    { entity: 'serviceOrders', column: 'status', from: ['aguardando_peca'], to: 'em_execucao' },
    { entity: 'serviceOrders', column: 'status', from: ['concluida', 'entregue'], to: 'encerrada' }
  ];

  for (const remap of remaps) {
    const table = physicalTable(remap.entity);
    const placeholders = remap.from.map(() => '?').join(', ');

    const result = db
      .prepare(
        `UPDATE "${table}" SET "${remap.column}" = ? WHERE "${remap.column}" IN (${placeholders})`
      )
      .run(remap.to, ...remap.from);

    const changed = Number(result.changes ?? 0);

    if (changed > 0) {
      console.log(
        `[arka-api] migração: ${changed} registro(s) em "${table}.${remap.column}" ` +
          `movidos de ${remap.from.join('/')} para "${remap.to}".`
      );
    }
  }
}

/**
 * Acrescenta colunas declaradas no descritor que ainda não existem na tabela.
 *
 * Sem isso, incluir um campo novo em uma entidade quebraria todas as gravações
 * em bancos já criados ("no such column"). As colunas retrofitadas entram como
 * nullable porque o SQLite não aceita `ADD COLUMN NOT NULL` sem valor padrão
 * o repositório já preenche o fallback do descritor na escrita.
 */
function addMissingColumns(db: DatabaseSync, definition: TableDef): void {
  const rows = db.prepare(`PRAGMA table_info("${definition.table}")`).all() as {
    name: string;
  }[];

  const existing = new Set(rows.map((row) => String(row.name)));

  for (const [column, def] of Object.entries(definition.columns)) {
    if (existing.has(column)) continue;

    db.exec(
      `ALTER TABLE "${definition.table}" ADD COLUMN "${column}" ${columnSqlType(def)};`
    );

    console.log(`[arka-api] migração: coluna "${definition.table}.${column}" adicionada.`);
  }
}

/**
 * Executa `work` dentro de uma transação, revertendo tudo se algo lançar.
 * Usado nas operações compostas (venda, OS, pagamento) para não deixar
 * estoque e financeiro inconsistentes pela metade.
 */
export function transaction<T>(work: () => T): T {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Se o rollback falhar, o erro original é o que importa.
    }
    throw error;
  }
}

export function closeDatabase(): void {
  if (!instance) return;
  instance.close();
  instance = null;
}
