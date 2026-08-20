import type { TableName } from '../types.js';

export type ColumnType = 'text' | 'int' | 'real' | 'bool' | 'json';

export interface ColumnDef {
  type: ColumnType;
  notNull?: boolean;
  /** Valor usado quando o payload não trouxer o campo. */
  fallback?: string | number | boolean;
}

export interface TableDef {
  /** Nome lógico usado na API e no client. */
  name: TableName;
  /** Nome físico da tabela no SQLite. */
  table: string;
  columns: Record<string, ColumnDef>;
  /** Colunas indexadas para as consultas mais frequentes. */
  indexes?: string[];
  /** Ordenação padrão aplicada nas listagens. */
  defaultOrder?: { column: string; direction: 'ASC' | 'DESC' };
}

const timestamps = {
  createdAt: { type: 'text', notNull: true } as ColumnDef,
  updatedAt: { type: 'text', notNull: true } as ColumnDef
};

export const tables: TableDef[] = [
  {
    name: 'users',
    table: 'users',
    columns: {
      name: { type: 'text', notNull: true },
      email: { type: 'text', notNull: true },
      password: { type: 'text' },
      role: { type: 'text', notNull: true, fallback: 'technician' },
      active: { type: 'bool', notNull: true, fallback: true },
      avatarUrl: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['email', 'role', 'active'],
    defaultOrder: { column: 'id', direction: 'ASC' }
  },
  {
    name: 'customers',
    table: 'customers',
    columns: {
      name: { type: 'text', notNull: true },
      document: { type: 'text', fallback: '' },
      phone: { type: 'text', fallback: '' },
      whatsapp: { type: 'text', fallback: '' },
      email: { type: 'text', fallback: '' },
      zipCode: { type: 'text', fallback: '' },
      address: { type: 'text', fallback: '' },
      number: { type: 'text', fallback: '' },
      neighborhood: { type: 'text', fallback: '' },
      city: { type: 'text', fallback: '' },
      state: { type: 'text', fallback: '' },
      notes: { type: 'text' },
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt
    },
    indexes: ['name', 'document', 'phone', 'email'],
    defaultOrder: { column: 'name', direction: 'ASC' }
  },
  {
    name: 'suppliers',
    table: 'suppliers',
    columns: {
      name: { type: 'text', notNull: true },
      document: { type: 'text', fallback: '' },
      phone: { type: 'text', fallback: '' },
      whatsapp: { type: 'text', fallback: '' },
      email: { type: 'text', fallback: '' },
      address: { type: 'text', fallback: '' },
      notes: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['name', 'document'],
    defaultOrder: { column: 'name', direction: 'ASC' }
  },
  {
    name: 'categories',
    table: 'product_categories',
    columns: {
      name: { type: 'text', notNull: true },
      description: { type: 'text' }
    },
    indexes: ['name'],
    defaultOrder: { column: 'name', direction: 'ASC' }
  },
  {
    name: 'products',
    table: 'products',
    columns: {
      sku: { type: 'text', notNull: true },
      name: { type: 'text', notNull: true },
      description: { type: 'text' },
      categoryId: { type: 'int', fallback: 0 },
      categoryName: { type: 'text' },
      brand: { type: 'text', fallback: '' },
      unit: { type: 'text', notNull: true, fallback: 'UN' },
      costPrice: { type: 'real', notNull: true, fallback: 0 },
      salePrice: { type: 'real', notNull: true, fallback: 0 },
      currentStock: { type: 'real', notNull: true, fallback: 0 },
      minStock: { type: 'real', notNull: true, fallback: 0 },
      supplierId: { type: 'int' },
      supplierName: { type: 'text' },
      barcode: { type: 'text', fallback: '' },
      imageUrl: { type: 'text' },
      active: { type: 'bool', notNull: true, fallback: true },
      // Marca produtos que são licenças de software (ex.: Windows). Quando true,
      // o PDV exige a chave/serial de cada unidade vendida.
      requiresLicenseKey: { type: 'bool', fallback: false },
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt
    },
    indexes: ['sku', 'barcode', 'categoryId', 'supplierId', 'active', 'name'],
    defaultOrder: { column: 'name', direction: 'ASC' }
  },
  {
    name: 'services',
    table: 'service_catalog',
    columns: {
      name: { type: 'text', notNull: true },
      description: { type: 'text' },
      category: { type: 'text', fallback: '' },
      price: { type: 'real', notNull: true, fallback: 0 },
      estimatedDuration: { type: 'text', fallback: '' },
      active: { type: 'bool', notNull: true, fallback: true },
      createdAt: timestamps.createdAt
    },
    indexes: ['name', 'category', 'active'],
    defaultOrder: { column: 'name', direction: 'ASC' }
  },
  {
    name: 'stockMovements',
    table: 'stock_movements',
    columns: {
      productId: { type: 'int', notNull: true },
      productName: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true },
      quantity: { type: 'real', notNull: true, fallback: 0 },
      previousStock: { type: 'real', notNull: true, fallback: 0 },
      newStock: { type: 'real', notNull: true, fallback: 0 },
      reason: { type: 'text', fallback: '' },
      referenceType: { type: 'text' },
      referenceId: { type: 'int' },
      userId: { type: 'int' },
      userName: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['productId', 'type', 'referenceType', 'referenceId', 'createdAt'],
    defaultOrder: { column: 'createdAt', direction: 'DESC' }
  },
  {
    name: 'sales',
    table: 'sales',
    columns: {
      code: { type: 'text', notNull: true },
      customerId: { type: 'int', notNull: true },
      customerName: { type: 'text', notNull: true },
      items: { type: 'json', notNull: true },
      subtotal: { type: 'real', notNull: true, fallback: 0 },
      discount: { type: 'real', notNull: true, fallback: 0 },
      surcharge: { type: 'real', notNull: true, fallback: 0 },
      total: { type: 'real', notNull: true, fallback: 0 },
      paymentMethod: { type: 'text', notNull: true },
      installments: { type: 'int', notNull: true, fallback: 1 },
      status: { type: 'text', notNull: true, fallback: 'concluida' },
      sellerId: { type: 'int' },
      sellerName: { type: 'text' },
      notes: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['code', 'customerId', 'status', 'paymentMethod', 'createdAt'],
    defaultOrder: { column: 'createdAt', direction: 'DESC' }
  },
  {
    name: 'serviceOrders',
    table: 'service_orders',
    columns: {
      code: { type: 'text', notNull: true },
      customerId: { type: 'int', notNull: true },
      customerName: { type: 'text', notNull: true },
      customerPhone: { type: 'text' },
      customerDocument: { type: 'text' },
      customerEmail: { type: 'text' },
      customerAddress: { type: 'text' },
      contractType: { type: 'text', fallback: 'avulso' },
      technicianId: { type: 'int' },
      technicianName: { type: 'text', fallback: '' },
      openingDate: { type: 'text', notNull: true },
      completionDate: { type: 'text' },
      status: { type: 'text', notNull: true, fallback: 'aberta' },
      problemDescription: { type: 'text', fallback: '' },
      requestedService: { type: 'text' },
      diagnosis: { type: 'text' },
      executedSolution: { type: 'text' },
      products: { type: 'json', notNull: true },
      services: { type: 'json', notNull: true },
      productsTotal: { type: 'real', notNull: true, fallback: 0 },
      servicesTotal: { type: 'real', notNull: true, fallback: 0 },
      discount: { type: 'real', notNull: true, fallback: 0 },
      surcharge: { type: 'real', notNull: true, fallback: 0 },
      total: { type: 'real', notNull: true, fallback: 0 },
      notes: { type: 'text' },
      stockDeducted: { type: 'bool', fallback: false },
      receivableCreated: { type: 'bool', fallback: false },
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt
    },
    indexes: ['code', 'customerId', 'status', 'contractType', 'technicianId', 'createdAt'],
    defaultOrder: { column: 'createdAt', direction: 'DESC' }
  },
  {
    name: 'accountsReceivable',
    table: 'accounts_receivable',
    columns: {
      code: { type: 'text', notNull: true },
      customerId: { type: 'int', fallback: 0 },
      customerName: { type: 'text', fallback: '' },
      description: { type: 'text', fallback: '' },
      amount: { type: 'real', notNull: true, fallback: 0 },
      paidAmount: { type: 'real', notNull: true, fallback: 0 },
      dueDate: { type: 'text', notNull: true },
      paymentDate: { type: 'text' },
      paymentMethod: { type: 'text' },
      status: { type: 'text', notNull: true, fallback: 'pendente' },
      originType: { type: 'text', notNull: true, fallback: 'manual' },
      originId: { type: 'int' },
      originCode: { type: 'text' },
      category: { type: 'text', fallback: '' },
      notes: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['code', 'customerId', 'status', 'dueDate', 'originType', 'originId'],
    defaultOrder: { column: 'dueDate', direction: 'ASC' }
  },
  {
    name: 'accountsPayable',
    table: 'accounts_payable',
    columns: {
      code: { type: 'text', notNull: true },
      supplierId: { type: 'int' },
      supplierName: { type: 'text', fallback: '' },
      description: { type: 'text', fallback: '' },
      category: { type: 'text', fallback: '' },
      amount: { type: 'real', notNull: true, fallback: 0 },
      paidAmount: { type: 'real', notNull: true, fallback: 0 },
      dueDate: { type: 'text', notNull: true },
      paymentDate: { type: 'text' },
      paymentMethod: { type: 'text' },
      status: { type: 'text', notNull: true, fallback: 'pendente' },
      notes: { type: 'text' },
      createdAt: timestamps.createdAt
    },
    indexes: ['code', 'supplierId', 'status', 'dueDate'],
    defaultOrder: { column: 'dueDate', direction: 'ASC' }
  },
  {
    name: 'companySettings',
    table: 'company_settings',
    columns: {
      name: { type: 'text', notNull: true },
      tradeName: { type: 'text', fallback: '' },
      cnpj: { type: 'text', fallback: '' },
      phone: { type: 'text', fallback: '' },
      whatsapp: { type: 'text', fallback: '' },
      email: { type: 'text', fallback: '' },
      address: { type: 'text', fallback: '' },
      city: { type: 'text', fallback: '' },
      state: { type: 'text', fallback: '' },
      zipCode: { type: 'text', fallback: '' },
      allowNegativeStock: { type: 'bool', notNull: true, fallback: false },
      logoUrl: { type: 'text' },
      termsAndConditions: { type: 'text' }
    },
    defaultOrder: { column: 'id', direction: 'ASC' }
  }
];

export const tablesByName = new Map<TableName, TableDef>(
  tables.map((definition) => [definition.name, definition])
);

export function getTable(name: string): TableDef | undefined {
  return tablesByName.get(name as TableName);
}

const sqliteTypes: Record<ColumnType, string> = {
  text: 'TEXT',
  int: 'INTEGER',
  real: 'REAL',
  bool: 'INTEGER',
  json: 'TEXT'
};

/** Tipo SQLite correspondente a uma coluna do descritor. */
export function columnSqlType(def: ColumnDef): string {
  return sqliteTypes[def.type];
}

/** Gera o DDL de uma tabela a partir do descritor. */
export function createTableSql(definition: TableDef): string {
  const columns = Object.entries(definition.columns).map(([column, def]) => {
    const notNull = def.notNull ? ' NOT NULL' : '';
    return `  "${column}" ${sqliteTypes[def.type]}${notNull}`;
  });

  return [
    `CREATE TABLE IF NOT EXISTS "${definition.table}" (`,
    ['  "id" INTEGER PRIMARY KEY AUTOINCREMENT', ...columns].join(',\n'),
    ');'
  ].join('\n');
}

/** Gera os índices declarados no descritor. */
export function createIndexesSql(definition: TableDef): string[] {
  return (definition.indexes ?? []).map(
    (column) =>
      `CREATE INDEX IF NOT EXISTS "idx_${definition.table}_${column}" ON "${definition.table}" ("${column}");`
  );
}
