// Entity models for Sistemas Arka ERP System

export type UserRole = 'admin' | 'technician' | 'financial';

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Customer {
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

export interface Supplier {
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

export interface ProductCategory {
  id?: number;
  name: string;
  description?: string;
}

export interface Product {
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
  /** Produto é uma licença de software (ex.: Windows) e exige chave na venda. */
  requiresLicenseKey?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItemCatalog {
  id?: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedDuration: string;
  active: boolean;
  createdAt: string;
}

export type StockMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'os';

export interface StockMovement {
  id?: number;
  productId: number;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceType?: 'sale' | 'os' | 'manual';
  referenceId?: number;
  userId?: number;
  userName?: string;
  createdAt: string;
}

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'boleto'
  | 'transferencia'
  | 'fiado';

export interface SaleItem {
  productId: number;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  /** Item é uma licença que exige chave na venda. */
  requiresLicenseKey?: boolean;
  /** Chaves/seriais das unidades vendidas (uma por unidade). */
  licenseKeys?: string[];
}

export interface Sale {
  id?: number;
  code: string;
  customerId: number;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  installments: number;
  status: 'concluida' | 'cancelada';
  sellerId?: number;
  sellerName?: string;
  notes?: string;
  createdAt: string;
}

export type OSStatus = 'aberta' | 'em_execucao' | 'encerrada' | 'cancelada';

export interface OSProduct {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface OSService {
  serviceId?: number;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceOrder {
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
  status: OSStatus;
  /** Problema relatado pelo cliente, nas palavras dele. */
  problemDescription: string;
  /** O que o técnico precisa executar: escopo do serviço e orientações. */
  requestedService?: string;
  diagnosis?: string;
  executedSolution?: string;
  products: OSProduct[];
  services: OSService[];
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

export type FinancialStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';

export interface AccountReceivable {
  id?: number;
  code: string;
  customerId: number;
  customerName: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  status: FinancialStatus;
  originType: 'sale' | 'os' | 'manual';
  originId?: number;
  originCode?: string;
  category: string;
  notes?: string;
  createdAt: string;
}

export interface AccountPayable {
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
  paymentMethod?: PaymentMethod;
  status: FinancialStatus;
  notes?: string;
  createdAt: string;
}

export interface CompanySettings {
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

export interface CustomerHistory {
  customer: Customer;
  serviceOrders: ServiceOrder[];
  sales: Sale[];
  purchasedProducts: {
    productName: string;
    quantity: number;
    totalSpent: number;
    lastPurchased: string;
  }[];
  totalSpent: number;
  openReceivablesTotal: number;
  receivables: AccountReceivable[];
}
