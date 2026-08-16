import { Repository } from './repository.js';
import { tables } from './schema.js';
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
  TableName,
  User
} from '../types.js';

const registry = new Map<TableName, Repository<{ id?: number }>>(
  tables.map((definition) => [definition.name, new Repository(definition)])
);

/** Repositório de uma coleção pelo nome lógico, ou `undefined` se não existir. */
export function repositoryFor(name: string): Repository<{ id?: number }> | undefined {
  return registry.get(name as TableName);
}

function typed<T extends { id?: number }>(name: TableName): Repository<T> {
  return registry.get(name) as unknown as Repository<T>;
}

export const repositories = {
  users: typed<User>('users'),
  customers: typed<Customer>('customers'),
  suppliers: typed<Supplier>('suppliers'),
  categories: typed<ProductCategory>('categories'),
  products: typed<Product>('products'),
  services: typed<ServiceItemCatalog>('services'),
  stockMovements: typed<StockMovement>('stockMovements'),
  sales: typed<Sale>('sales'),
  serviceOrders: typed<ServiceOrder>('serviceOrders'),
  accountsReceivable: typed<AccountReceivable>('accountsReceivable'),
  accountsPayable: typed<AccountPayable>('accountsPayable'),
  companySettings: typed<CompanySettings>('companySettings')
};

/** Ordem de limpeza/inserção usada em reset e restauração de backup. */
export const tableOrder: TableName[] = tables.map((definition) => definition.name);
