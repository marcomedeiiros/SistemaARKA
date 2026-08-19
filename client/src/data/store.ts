import { http } from '../lib/http';
import { Collection, WhereClause, compareValues } from './collection';
import type {
  AccountPayable,
  AccountReceivable,
  CompanySettings,
  Customer,
  Product,
  ProductCategory,
  Sale,
  ServiceItemCatalog,
  ServiceOrder,
  StockMovement,
  Supplier,
  User
} from '../types';

export type TableName =
  | 'users'
  | 'customers'
  | 'suppliers'
  | 'categories'
  | 'products'
  | 'services'
  | 'stockMovements'
  | 'sales'
  | 'serviceOrders'
  | 'accountsReceivable'
  | 'accountsPayable'
  | 'companySettings';

export interface Snapshot {
  users: User[];
  customers: Customer[];
  suppliers: Supplier[];
  categories: ProductCategory[];
  products: Product[];
  services: ServiceItemCatalog[];
  stockMovements: StockMovement[];
  sales: Sale[];
  serviceOrders: ServiceOrder[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  companySettings: CompanySettings[];
}

const TABLE_NAMES: TableName[] = [
  'users',
  'customers',
  'suppliers',
  'categories',
  'products',
  'services',
  'stockMovements',
  'sales',
  'serviceOrders',
  'accountsReceivable',
  'accountsPayable',
  'companySettings'
];

function emptySnapshot(): Snapshot {
  return {
    users: [],
    customers: [],
    suppliers: [],
    categories: [],
    products: [],
    services: [],
    stockMovements: [],
    sales: [],
    serviceOrders: [],
    accountsReceivable: [],
    accountsPayable: [],
    companySettings: []
  };
}

/**
 * Espelho em memória dos dados servidos pela API.
 *
 * Não há persistência no navegador: nada de IndexedDB ou localStorage. O
 * conteúdo é buscado do servidor no boot, fica em memória enquanto a aba está
 * aberta e é recarregado após cada gravação, de modo que a tela sempre reflete
 * o estado real do banco.
 */
class DataStore {
  private snapshot: Snapshot = emptySnapshot();
  private revision = 0;
  private listeners = new Set<() => void>();
  private loaded = false;

  /** Fila de recargas: garante ordem e evita que uma resposta antiga sobrescreva uma nova. */
  private chain: Promise<void> = Promise.resolve();
  private initial: Promise<void> | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getRevision = (): number => this.revision;

  private notify(): void {
    this.revision += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private async fetchSnapshot(): Promise<void> {
    const snapshot = await http.get<Snapshot>('/snapshot');
    this.snapshot = normalize(snapshot);
    this.loaded = true;
    this.notify();
  }

  /** Encadeia mais uma busca ao fim da fila. */
  private enqueue(): Promise<void> {
    this.chain = this.chain.catch(() => undefined).then(() => this.fetchSnapshot());
    return this.chain;
  }

  /** Carga inicial. Chamadas simultâneas compartilham a mesma requisição. */
  load(): Promise<void> {
    if (!this.initial) {
      this.initial = this.enqueue().catch((error: unknown) => {
        // Libera para que a tela de erro possa tentar de novo.
        this.initial = null;
        throw error;
      });
    }
    return this.initial;
  }

  /** Resolve assim que houver dados em memória, disparando a carga se preciso. */
  ready(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    return this.load();
  }

  /**
   * Recarrega tudo depois de uma gravação. Sempre faz uma nova requisição,
   * enfileirada após as anteriores, para que a tela reflita o que foi gravado.
   */
  refresh(): Promise<void> {
    return this.enqueue();
  }

  /** Aplica um retrato já recebido (ex.: resposta de restauração), evitando ida extra à API. */
  apply(snapshot: Snapshot): void {
    this.snapshot = normalize(snapshot);
    this.loaded = true;
    this.notify();
  }

  /**
   * Descarta o retrato em memória (usado no logout). Zera o estado de carga
   * para que a próxima sessão busque os dados do zero, já com o novo token.
   */
  reset(): void {
    this.snapshot = emptySnapshot();
    this.loaded = false;
    this.initial = null;
    this.notify();
  }

  rows<K extends TableName>(name: K): Snapshot[K] {
    return this.snapshot[name];
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * Normaliza a ordem natural de cada coleção por `id` crescente, que é a mesma
 * ordem de chave primária que o código dos módulos assumia antes. Chamadas
 * explícitas a `orderBy`/`sortBy` continuam mandando no resultado final.
 */
function normalize(snapshot: Snapshot): Snapshot {
  const normalized = emptySnapshot();

  for (const name of TABLE_NAMES) {
    const rows = Array.isArray(snapshot?.[name]) ? snapshot[name] : [];
    normalized[name] = [...(rows as { id?: number }[])].sort(
      (a, b) => (a.id ?? 0) - (b.id ?? 0)
    ) as never;
  }

  return normalized;
}

export const store = new DataStore();

/** Uma coleção da API, com leituras em memória e gravações via HTTP. */
class Table<T extends { id?: number }> {
  constructor(private readonly name: TableName) {}

  private async rows(): Promise<T[]> {
    await store.ready();
    return store.rows(this.name) as unknown as T[];
  }

  private collection(): Collection<T> {
    return new Collection<T>(() => this.rows());
  }

  /* ── Leitura ── */

  async toArray(): Promise<T[]> {
    return [...(await this.rows())];
  }

  async count(): Promise<number> {
    return (await this.rows()).length;
  }

  async get(id: number): Promise<T | undefined> {
    return (await this.rows()).find((row) => row.id === id);
  }

  filter(predicate: (row: T) => boolean): Collection<T> {
    return this.collection().filter(predicate);
  }

  where(key: string): WhereClause<T> {
    return new WhereClause<T>(() => this.rows(), key);
  }

  orderBy(key: string): Collection<T> {
    return new Collection<T>(async () =>
      [...(await this.rows())].sort((a, b) =>
        compareValues(
          (a as Record<string, never>)[key],
          (b as Record<string, never>)[key]
        )
      )
    );
  }

  toCollection(): Collection<T> {
    return this.collection();
  }

  /* ── Gravação ── */

  /** Cria um registro e devolve o id gerado pelo banco. */
  async add(record: Omit<T, 'id'> | T): Promise<number> {
    const created = await http.post<T>(`/${this.name}`, stripId(record));
    await store.refresh();
    return created.id!;
  }

  /** Insere vários registros de uma vez. */
  async bulkAdd(records: (Omit<T, 'id'> | T)[]): Promise<number[]> {
    const created = await http.post<T[]>(
      `/${this.name}/bulk`,
      records.map((record) => stripId(record))
    );
    await store.refresh();
    return created.map((row) => row.id!);
  }

  /** Grava o registro inteiro: atualiza quando há `id`, cria caso contrário. */
  async put(record: T): Promise<number> {
    if (record.id === undefined || record.id === null) {
      return this.add(record);
    }

    const saved = await http.put<T>(`/${this.name}/${record.id}`, stripId(record));
    await store.refresh();
    return saved.id!;
  }

  /** Atualiza apenas os campos informados. */
  async update(id: number, patch: Partial<T>): Promise<T> {
    const saved = await http.patch<T>(`/${this.name}/${id}`, stripId(patch));
    await store.refresh();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await http.delete<void>(`/${this.name}/${id}`);
    await store.refresh();
  }
}

function stripId<T extends object>(record: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = record as T & { id?: number };
  return rest;
}

/**
 * Ponto de acesso aos dados, com a mesma forma que o código já usava.
 * As leituras são sincronizadas com o retrato em memória; as gravações vão
 * para a API e disparam recarga automática.
 */
export const db = {
  users: new Table<User>('users'),
  customers: new Table<Customer>('customers'),
  suppliers: new Table<Supplier>('suppliers'),
  categories: new Table<ProductCategory>('categories'),
  products: new Table<Product>('products'),
  services: new Table<ServiceItemCatalog>('services'),
  stockMovements: new Table<StockMovement>('stockMovements'),
  sales: new Table<Sale>('sales'),
  serviceOrders: new Table<ServiceOrder>('serviceOrders'),
  accountsReceivable: new Table<AccountReceivable>('accountsReceivable'),
  accountsPayable: new Table<AccountPayable>('accountsPayable'),
  companySettings: new Table<CompanySettings>('companySettings')
};

/** Carrega os dados iniciais. Chamado uma vez no boot da aplicação. */
export function initializeData(): Promise<void> {
  return store.load();
}
