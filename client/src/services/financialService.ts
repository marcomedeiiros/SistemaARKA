import { db } from '../data/store';
import { operations } from '../data/operations';
import { AccountPayable, AccountReceivable, PaymentMethod } from '../types';

/**
 * Financeiro.
 *
 * As baixas são validadas no servidor: valor precisa ser maior que zero e não
 * pode passar do saldo em aberto do título.
 */
export const financialService = {
  generateReceivableCode(): Promise<string> {
    return operations.nextCode('receivable');
  },

  generatePayableCode(): Promise<string> {
    return operations.nextCode('payable');
  },

  /** Recebimento total ou parcial de uma conta a receber. */
  receivePayment(
    id: number,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paymentDate?: string
  ): Promise<AccountReceivable> {
    return operations.receivePayment(id, { amount: paymentAmount, paymentMethod, paymentDate });
  },

  /** Pagamento total ou parcial de uma conta a pagar. */
  payAccount(
    id: number,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paymentDate?: string
  ): Promise<AccountPayable> {
    return operations.payAccount(id, { amount: paymentAmount, paymentMethod, paymentDate });
  },

  createReceivable(payload: {
    customerId?: number;
    customerName: string;
    description: string;
    amount: number;
    dueDate: string;
    category?: string;
    notes?: string;
  }): Promise<AccountReceivable> {
    return operations.createReceivable(payload);
  },

  createPayable(payload: {
    supplierId?: number;
    supplierName: string;
    description: string;
    category?: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }): Promise<AccountPayable> {
    return operations.createPayable(payload);
  },

  /** Resumo do fluxo de caixa: realizado, previsto, saldo e valores vencidos. */
  async getCashFlowSummary(startDate?: string, endDate?: string) {
    let receivables = await db.accountsReceivable.toArray();
    let payables = await db.accountsPayable.toArray();

    if (startDate && endDate) {
      receivables = receivables.filter((r) => r.dueDate >= startDate && r.dueDate <= endDate);
      payables = payables.filter((p) => p.dueDate >= startDate && p.dueDate <= endDate);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let totalInflow = 0;
    let projectedInflow = 0;
    let overdueReceivables = 0;

    for (const r of receivables) {
      totalInflow += r.paidAmount || 0;
      projectedInflow += r.amount;

      if (r.status !== 'pago' && r.status !== 'cancelado' && r.dueDate < todayStr) {
        overdueReceivables += r.amount - (r.paidAmount || 0);
      }
    }

    let totalOutflow = 0;
    let projectedOutflow = 0;
    let overduePayables = 0;

    for (const p of payables) {
      totalOutflow += p.paidAmount || 0;
      projectedOutflow += p.amount;

      if (p.status !== 'pago' && p.status !== 'cancelado' && p.dueDate < todayStr) {
        overduePayables += p.amount - (p.paidAmount || 0);
      }
    }

    return {
      totalInflow,
      projectedInflow,
      overdueReceivables,
      totalOutflow,
      projectedOutflow,
      overduePayables,
      currentBalance: totalInflow - totalOutflow,
      projectedBalance: projectedInflow - projectedOutflow
    };
  }
};
