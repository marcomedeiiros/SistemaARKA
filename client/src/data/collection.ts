/**
 * Consultas encadeáveis sobre as coleções já carregadas em memória.
 *
 * Reproduz o subconjunto da API do Dexie que a aplicação usava, para que os
 * módulos continuem escritos da mesma forma agora que os dados vêm da API.
 */

type Comparable = string | number | boolean | undefined | null;

function valueOf<T>(row: T, key: string): Comparable {
  return (row as Record<string, Comparable>)[key];
}

/** Comparação estável: números por valor, textos com regras do português. */
function compare(a: Comparable, b: Comparable): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b), 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  });
}

export class Collection<T> {
  constructor(
    private readonly source: () => Promise<T[]>,
    private readonly reversed = false
  ) {}

  private derive(next: () => Promise<T[]>, reversed = this.reversed): Collection<T> {
    return new Collection<T>(next, reversed);
  }

  filter(predicate: (row: T) => boolean): Collection<T> {
    return this.derive(async () => (await this.source()).filter(predicate));
  }

  /** Alias de `filter`, para leitura mais natural em cadeias. */
  and(predicate: (row: T) => boolean): Collection<T> {
    return this.filter(predicate);
  }

  limit(count: number): Collection<T> {
    return this.derive(async () => (await this.resolve()).slice(0, count));
  }

  offset(count: number): Collection<T> {
    return this.derive(async () => (await this.resolve()).slice(count));
  }

  /** Inverte a ordem do resultado final. */
  reverse(): Collection<T> {
    return this.derive(this.source, !this.reversed);
  }

  private async resolve(): Promise<T[]> {
    const rows = [...(await this.source())];
    return this.reversed ? rows.reverse() : rows;
  }

  async toArray(): Promise<T[]> {
    return this.resolve();
  }

  /** Ordena pela chave informada, respeitando um `reverse()` pendente. */
  async sortBy(key: string): Promise<T[]> {
    const rows = [...(await this.source())].sort((a, b) =>
      compare(valueOf(a, key), valueOf(b, key))
    );
    return this.reversed ? rows.reverse() : rows;
  }

  async first(): Promise<T | undefined> {
    return (await this.resolve())[0];
  }

  async last(): Promise<T | undefined> {
    const rows = await this.resolve();
    return rows[rows.length - 1];
  }

  async count(): Promise<number> {
    return (await this.source()).length;
  }

  async each(callback: (row: T) => void): Promise<void> {
    for (const row of await this.resolve()) {
      callback(row);
    }
  }
}

/** Filtros aplicáveis a um campo específico, no estilo `where(campo).equals(x)`. */
export class WhereClause<T> {
  constructor(
    private readonly source: () => Promise<T[]>,
    private readonly key: string
  ) {}

  private build(predicate: (value: Comparable) => boolean): Collection<T> {
    return new Collection<T>(async () =>
      (await this.source()).filter((row) => predicate(valueOf(row, this.key)))
    );
  }

  equals(target: Comparable): Collection<T> {
    return this.build((value) => value === target);
  }

  notEqual(target: Comparable): Collection<T> {
    return this.build((value) => value !== target);
  }

  anyOf(targets: Comparable[]): Collection<T> {
    const set = new Set(targets);
    return this.build((value) => set.has(value as Comparable));
  }

  above(target: NonNullable<Comparable>): Collection<T> {
    return this.build((value) => value !== undefined && value !== null && compare(value, target) > 0);
  }

  aboveOrEqual(target: NonNullable<Comparable>): Collection<T> {
    return this.build((value) => value !== undefined && value !== null && compare(value, target) >= 0);
  }

  below(target: NonNullable<Comparable>): Collection<T> {
    return this.build((value) => value !== undefined && value !== null && compare(value, target) < 0);
  }

  belowOrEqual(target: NonNullable<Comparable>): Collection<T> {
    return this.build((value) => value !== undefined && value !== null && compare(value, target) <= 0);
  }

  between(lower: NonNullable<Comparable>, upper: NonNullable<Comparable>): Collection<T> {
    return this.build(
      (value) =>
        value !== undefined &&
        value !== null &&
        compare(value, lower) >= 0 &&
        compare(value, upper) <= 0
    );
  }

  startsWith(prefix: string): Collection<T> {
    return this.build((value) => String(value ?? '').startsWith(prefix));
  }

  startsWithIgnoreCase(prefix: string): Collection<T> {
    const needle = prefix.toLowerCase();
    return this.build((value) => String(value ?? '').toLowerCase().startsWith(needle));
  }

  includesIgnoreCase(term: string): Collection<T> {
    const needle = term.toLowerCase();
    return this.build((value) => String(value ?? '').toLowerCase().includes(needle));
  }
}

export { compare as compareValues };
