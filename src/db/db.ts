import Dexie, { type Table } from 'dexie';

// Inline types to avoid module resolution issues
interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
}

interface Customer {
  id?: number;
  name: string;
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  zipCode: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id?: number;
  name: string;
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

interface ProductCategory {
  id?: number;
  name: string;
  description?: string;
}

interface Product {
  id?: number;
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  brand: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  supplierId?: number;
  supplierName?: string;
  barcode: string;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceItemCatalog {
  id?: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedDuration: string;
  active: boolean;
  createdAt: string;
}

interface StockMovement {
  id?: number;
  productId: number;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType?: string;
  referenceId?: number;
  userId?: number;
  userName?: string;
  createdAt: string;
}

interface Sale {
  id?: number;
  code: string;
  customerId: number;
  customerName: string;
  items: object[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: string;
  installments: number;
  status: string;
  sellerId?: number;
  sellerName?: string;
  notes?: string;
  createdAt: string;
}

interface ServiceOrder {
  id?: number;
  code: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  customerEmail?: string;
  customerAddress?: string;
  technicianId?: number;
  technicianName: string;
  openingDate: string;
  completionDate?: string;
  status: string;
  problemDescription: string;
  diagnosis?: string;
  executedSolution?: string;
  products: object[];
  services: object[];
  productsTotal: number;
  servicesTotal: number;
  discount: number;
  surcharge: number;
  total: number;
  notes?: string;
  stockDeducted?: boolean;
  receivableCreated?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountReceivable {
  id?: number;
  code: string;
  customerId: number;
  customerName: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  status: string;
  originType: string;
  originId?: number;
  originCode?: string;
  category: string;
  notes?: string;
  createdAt: string;
}

interface AccountPayable {
  id?: number;
  code: string;
  supplierId?: number;
  supplierName: string;
  description: string;
  category: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface CompanySettings {
  id?: number;
  name: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  allowNegativeStock: boolean;
  logoUrl?: string;
  termsAndConditions?: string;
}

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
