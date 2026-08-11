import { db } from '../db/db';
import { AccountReceivable, AccountPayable, PaymentMethod } from '../types';

export const financialService = {
  /**
   * Generates next Receivable Code like REC #000003
   */
  async generateReceivableCode(): Promise<string> {
    const count = await db.accountsReceivable.count();
    return `REC #${String(count + 1).padStart(6, '0')}`;
  },

  /**
   * Generates next Payable Code like PAG #000003
   */
  async generatePayableCode(): Promise<string> {
    const count = await db.accountsPayable.count();
    return `PAG #${String(count + 1).padStart(6, '0')}`;
  },

  /**
   * Process a payment on an Account Receivable (supports partial payment)
   */
  async receivePayment(
    id: number,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paymentDate = new Date().toISOString().split('T')[0]
  ) {
    const item = await db.accountsReceivable.get(id);
    if (!item) throw new Error('Conta a receber não encontrada.');

    const newPaidAmount = (item.paidAmount || 0) + paymentAmount;
    item.paidAmount = Math.min(newPaidAmount, item.amount);
    item.paymentMethod = paymentMethod;
    item.paymentDate = paymentDate;

    if (item.paidAmount >= item.amount) {
      item.status = 'pago';
    }

    await db.accountsReceivable.put(item);
    return item;
  },

  /**
   * Process a payment on an Account Payable
   */
  async payAccount(
    id: number,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paymentDate = new Date().toISOString().split('T')[0]
  ) {
    const item = await db.accountsPayable.get(id);
    if (!item) throw new Error('Conta a pagar não encontrada.');

    const newPaidAmount = (item.paidAmount || 0) + paymentAmount;
    item.paidAmount = Math.min(newPaidAmount, item.amount);
    item.paymentMethod = paymentMethod;
    item.paymentDate = paymentDate;

    if (item.paidAmount >= item.amount) {
      item.status = 'pago';
    }

    await db.accountsPayable.put(item);
    return item;
  },

  /**
   * Get Cash Flow Summary (Entradas, Saídas, Saldo, Saldo Previsto, Overdue)
   */
  async getCashFlowSummary(startDate?: string, endDate?: string) {
    let receivables = await db.accountsReceivable.toArray();
    let payables = await db.accountsPayable.toArray();

    if (startDate && endDate) {
      receivables = receivables.filter((r) => r.dueDate >= startDate && r.dueDate <= endDate);
      payables = payables.filter((p) => p.dueDate >= startDate && p.dueDate <= endDate);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let totalInflow = 0; // Total Realizado Recebido
    let projectedInflow = 0; // Total Previsto
    let overdueReceivables = 0;

    for (const r of receivables) {
      totalInflow += r.paidAmount || 0;
      projectedInflow += r.amount;

      if (r.status !== 'pago' && r.status !== 'cancelado' && r.dueDate < todayStr) {
        overdueReceivables += r.amount - (r.paidAmount || 0);
      }
    }

    let totalOutflow = 0; // Total Realizado Pago
    let projectedOutflow = 0; // Total Previsto A Pagar
    let overduePayables = 0;

    for (const p of payables) {
      totalOutflow += p.paidAmount || 0;
      projectedOutflow += p.amount;

      if (p.status !== 'pago' && p.status !== 'cancelado' && p.dueDate < todayStr) {
        overduePayables += p.amount - (p.paidAmount || 0);
      }
    }

    const currentBalance = totalInflow - totalOutflow;
    const projectedBalance = projectedInflow - projectedOutflow;

    return {
      totalInflow,
      projectedInflow,
      overdueReceivables,
      totalOutflow,
      projectedOutflow,
      overduePayables,
      currentBalance,
      projectedBalance
    };
  }
};
