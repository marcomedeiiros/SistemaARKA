import { http } from '../lib/http';
import { store, type Snapshot } from './store';
import type {
  AccountPayable,
  AccountReceivable,
  OSStatus,
  PaymentMethod,
  Sale,
  ServiceOrder,
  StockMovement,
  StockMovementType
} from '../types';

/**
 * Operações de negócio que envolvem mais de uma coleção (venda, OS, estoque,
 * baixa financeira). Ficam no servidor, dentro de transações, para que estoque
 * e financeiro nunca sejam gravados pela metade.
 */

async function mutate<T>(promise: Promise<T>): Promise<T> {
  const result = await promise;
  await store.refresh();
  return result;
}

export type CodeKind = 'sale' | 'os' | 'receivable' | 'payable';

export interface PaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
}

export const operations = {
  /** Próximo código sequencial de um documento. */
  async nextCode(kind: CodeKind): Promise<string> {
    const { code } = await http.get<{ code: string }>(`/operations/next-code/${kind}`);
    return code;
  },

  /* ── Vendas ── */

  createSale(payload: Omit<Sale, 'id' | 'code' | 'createdAt'> & { sellerName?: string }) {
    return mutate(http.post<Sale>('/operations/sales', payload));
  },

  /** Cancela sem apagar: estorna o estoque e cancela a conta a receber. */
  cancelSale(id: number, userName?: string) {
    return mutate(http.post<Sale>(`/operations/sales/${id}/cancel`, { userName }));
  },

  /* ── Ordens de serviço ── */

  createServiceOrder(
    payload: Omit<
      ServiceOrder,
      'id' | 'code' | 'createdAt' | 'updatedAt' | 'stockDeducted' | 'receivableCreated'
    > & { userName?: string }
  ) {
    return mutate(http.post<ServiceOrder>('/operations/service-orders', payload));
  },

  updateServiceOrder(id: number, patch: Partial<ServiceOrder> & { userName?: string }) {
    return mutate(http.patch<ServiceOrder>(`/operations/service-orders/${id}`, patch));
  },

  changeOsStatus(id: number, status: OSStatus, userName?: string) {
    return mutate(
      http.post<ServiceOrder>(`/operations/service-orders/${id}/status`, { status, userName })
    );
  },

  /* ── Estoque ── */

  registerStockMovement(payload: {
    productId: number;
    type: StockMovementType;
    quantity: number;
    reason: string;
    userName?: string;
  }) {
    return mutate(http.post<StockMovement>('/operations/stock-movements', payload));
  },

  /* ── Financeiro ── */

  receivePayment(id: number, payment: PaymentPayload) {
    return mutate(
      http.post<AccountReceivable>(`/operations/receivables/${id}/receive`, payment)
    );
  },

  payAccount(id: number, payment: PaymentPayload) {
    return mutate(http.post<AccountPayable>(`/operations/payables/${id}/pay`, payment));
  },

  createReceivable(payload: {
    customerId?: number;
    customerName: string;
    description: string;
    amount: number;
    dueDate: string;
    category?: string;
    notes?: string;
  }) {
    return mutate(http.post<AccountReceivable>('/operations/receivables', payload));
  },

  createPayable(payload: {
    supplierId?: number;
    supplierName: string;
    description: string;
    category?: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }) {
    return mutate(http.post<AccountPayable>('/operations/payables', payload));
  }
};

interface AdminResponse {
  ok: boolean;
  snapshot: Snapshot;
  imported?: Record<string, number>;
}

export type BackupFile = Snapshot & { version: number; exportedAt: string };

export const admin = {
  /** Baixa o conteúdo completo do banco para gerar o arquivo de backup. */
  backup() {
    return http.get<BackupFile>('/admin/backup');
  },

  /** Substitui todo o conteúdo do banco pelo arquivo enviado. */
  async restore(payload: unknown) {
    const response = await http.post<AdminResponse>('/admin/restore', payload);
    store.apply(response.snapshot);
    return response;
  },

  /** Redefine o banco para o catálogo de demonstração. */
  async seed() {
    const response = await http.post<AdminResponse>('/admin/seed');
    store.apply(response.snapshot);
    return response;
  },

  /** Apaga todos os registros. */
  async clear() {
    const response = await http.post<AdminResponse>('/admin/clear');
    store.apply(response.snapshot);
    return response;
  }
};
