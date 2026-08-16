import { getDatabase } from './connection.js';
import type { ColumnDef, TableDef } from './schema.js';

type SqlValue = string | number | null;
type Row = Record<string, unknown>;

/** Converte um valor do domínio para o formato aceito pelo SQLite. */
function toSql(value: unknown, def: ColumnDef): SqlValue {
  const effective = value === undefined || value === null ? def.fallback : value;

  if (effective === undefined || effective === null) {
    return null;
  }

  switch (def.type) {
    case 'bool':
      return effective ? 1 : 0;
    case 'int': {
      const parsed = Number(effective);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    }
    case 'real': {
      const parsed = Number(effective);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'json':
      return JSON.stringify(effective);
    case 'text':
      return String(effective);
  }
}

/** Converte uma linha do SQLite de volta para o formato do domínio. */
function fromSql(value: unknown, def: ColumnDef): unknown {
  if (value === null || value === undefined) {
    return def.type === 'json' ? [] : undefined;
  }

  switch (def.type) {
    case 'bool':
      return Boolean(value);
    case 'int':
    case 'real':
      return Number(value);
    case 'json':
      try {
        return JSON.parse(String(value));
      } catch {
        return [];
      }
    case 'text':
      return String(value);
  }
}

/**
 * Repositório CRUD derivado do descritor da tabela. Como o mapeamento
 * coluna/tipo vem do schema, não há serializador escrito à mão por entidade.
 */
export class Repository<T extends { id?: number }> {
  private readonly columnNames: string[];

  constructor(private readonly definition: TableDef) {
    this.columnNames = Object.keys(definition.columns);
  }

  get name(): string {
    return this.definition.name;
  }

  private hydrate(row: Row | undefined): T | undefined {
    if (!row) return undefined;

    const entity: Row = { id: Number(row.id) };

    for (const [column, def] of Object.entries(this.definition.columns)) {
      const value = fromSql(row[column], def);
      if (value !== undefined) {
        entity[column] = value;
      }
    }

    return entity as T;
  }

  private orderByClause(): string {
    const order = this.definition.defaultOrder;
    if (!order) return '';
    return ` ORDER BY "${order.column}" ${order.direction}`;
  }

  findAll(): T[] {
    const rows = getDatabase()
      .prepare(`SELECT * FROM "${this.definition.table}"${this.orderByClause()}`)
      .all() as Row[];

    return rows.map((row) => this.hydrate(row)!).filter(Boolean);
  }

  findById(id: number): T | undefined {
    const row = getDatabase()
      .prepare(`SELECT * FROM "${this.definition.table}" WHERE "id" = ?`)
      .get(id) as Row | undefined;

    return this.hydrate(row);
  }

  findWhere(column: string, value: SqlValue): T[] {
    if (!this.columnNames.includes(column)) {
      throw new BadColumnError(column, this.definition.name);
    }

    const rows = getDatabase()
      .prepare(`SELECT * FROM "${this.definition.table}" WHERE "${column}" = ?`)
      .all(value) as Row[];

    return rows.map((row) => this.hydrate(row)!).filter(Boolean);
  }

  count(): number {
    const row = getDatabase()
      .prepare(`SELECT COUNT(*) AS total FROM "${this.definition.table}"`)
      .get() as { total: number };

    return Number(row.total);
  }

  insert(payload: Partial<T>): T {
    const columns = this.columnNames;
    const placeholders = columns.map(() => '?').join(', ');
    const quoted = columns.map((column) => `"${column}"`).join(', ');

    const values = columns.map((column) =>
      toSql((payload as Row)[column], this.definition.columns[column]!)
    );

    const result = getDatabase()
      .prepare(`INSERT INTO "${this.definition.table}" (${quoted}) VALUES (${placeholders})`)
      .run(...values);

    const id = Number(result.lastInsertRowid);
    return this.findById(id)!;
  }

  insertMany(payloads: Partial<T>[]): T[] {
    return payloads.map((payload) => this.insert(payload));
  }

  /**
   * Insere preservando o `id` do payload. Usado na restauração de backup, onde
   * as referências entre coleções (originId, referenceId, categoryId...)
   * dependem dos ids originais. Cai para `insert` se o id não for válido.
   */
  insertPreservingId(payload: Partial<T>): T {
    const id = Number((payload as Row).id);
    if (!Number.isInteger(id) || id <= 0) {
      return this.insert(payload);
    }

    const columns = this.columnNames;
    const quoted = ['"id"', ...columns.map((column) => `"${column}"`)].join(', ');
    const placeholders = new Array(columns.length + 1).fill('?').join(', ');

    const values: SqlValue[] = [
      id,
      ...columns.map((column) => toSql((payload as Row)[column], this.definition.columns[column]!))
    ];

    getDatabase()
      .prepare(`INSERT INTO "${this.definition.table}" (${quoted}) VALUES (${placeholders})`)
      .run(...values);

    return this.findById(id)!;
  }

  /** Substitui o registro inteiro (equivalente ao `put` que o client usava). */
  replace(id: number, payload: Partial<T>): T | undefined {
    if (!this.findById(id)) return undefined;

    const columns = this.columnNames;
    const assignments = columns.map((column) => `"${column}" = ?`).join(', ');
    const values = columns.map((column) =>
      toSql((payload as Row)[column], this.definition.columns[column]!)
    );

    getDatabase()
      .prepare(`UPDATE "${this.definition.table}" SET ${assignments} WHERE "id" = ?`)
      .run(...values, id);

    return this.findById(id);
  }

  /** Atualiza apenas os campos presentes no payload. */
  update(id: number, patch: Partial<T>): T | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const columns = Object.keys(patch).filter(
      (column) => column !== 'id' && this.columnNames.includes(column)
    );

    if (columns.length === 0) return existing;

    const assignments = columns.map((column) => `"${column}" = ?`).join(', ');
    const values = columns.map((column) =>
      toSql((patch as Row)[column], this.definition.columns[column]!)
    );

    getDatabase()
      .prepare(`UPDATE "${this.definition.table}" SET ${assignments} WHERE "id" = ?`)
      .run(...values, id);

    return this.findById(id);
  }

  remove(id: number): boolean {
    const result = getDatabase()
      .prepare(`DELETE FROM "${this.definition.table}" WHERE "id" = ?`)
      .run(id);

    return Number(result.changes) > 0;
  }

  clear(): void {
    getDatabase().exec(`DELETE FROM "${this.definition.table}";`);
    getDatabase()
      .prepare(`DELETE FROM sqlite_sequence WHERE name = ?`)
      .run(this.definition.table);
  }
}

export class BadColumnError extends Error {
  constructor(column: string, table: string) {
    super(`A coluna "${column}" não existe em "${table}".`);
    this.name = 'BadColumnError';
  }
}
