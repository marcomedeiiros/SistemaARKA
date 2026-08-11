import Dexie, { Table } from 'dexie';
import {
  User,
  Customer,
  Supplier,
  ProductCategory,
  Product,
  ServiceItemCatalog,
  StockMovement,
  Sale,
  ServiceOrder,
  AccountReceivable,
  AccountPayable,
  CompanySettings
} from '../types';

export class ArkaDatabase extends Dexie {
  users!: Table<User>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  categories!: Table<ProductCategory>;
  products!: Table<Product>;
  services!: Table<ServiceItemCatalog>;
  stockMovements!: Table<StockMovement>;
  sales!: Table<Sale>;
  serviceOrders!: Table<ServiceOrder>;
  accountsReceivable!: Table<AccountReceivable>;
  accountsPayable!: Table<AccountPayable>;
  companySettings!: Table<CompanySettings>;

  constructor() {
    super('SistemasArkaERP');

    this.version(1).stores({
      users: '++id, email, role, active',
      customers: '++id, name, document, phone, email',
      suppliers: '++id, name, document, phone',
      categories: '++id, name',
      products: '++id, sku, barcode, categoryId, supplierId, active',
      services: '++id, name, category, active',
      stockMovements: '++id, productId, type, referenceType, referenceId, createdAt',
      sales: '++id, code, customerId, status, paymentMethod, createdAt',
      serviceOrders: '++id, code, customerId, status, technicianId, createdAt',
      accountsReceivable: '++id, code, customerId, status, dueDate, originType, originId',
      accountsPayable: '++id, code, supplierId, status, dueDate',
      companySettings: '++id'
    });
  }
}

export const db = new ArkaDatabase();
