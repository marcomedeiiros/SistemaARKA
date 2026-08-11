import { db } from '../db/db';
import { ServiceOrder, OSStatus, AccountReceivable } from '../types';
import { inventoryService } from './inventoryService';

export const osService = {
  /**
   * Generates next code like OS #000003
   */
  async generateOSCode(): Promise<string> {
    const count = await db.serviceOrders.count();
    const nextNum = count + 1;
    return `OS #${String(nextNum).padStart(6, '0')}`;
  },

  /**
   * Create new Service Order
   */
  async createServiceOrder(
    osData: Omit<ServiceOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'>,
    userName = 'Técnico'
  ): Promise<ServiceOrder> {
    const code = await this.generateOSCode();
    const now = new Date().toISOString();

    const os: ServiceOrder = {
      ...osData,
      code,
      stockDeducted: false,
      receivableCreated: false,
      createdAt: now,
      updatedAt: now
    };

    const osId = await db.serviceOrders.add(os);
    os.id = osId;

    // Check if status is immediately completed or delivered upon creation
    if (os.status === 'concluida' || os.status === 'entregue') {
      await this.processOSFinalization(os, userName);
    }

    return os;
  },

  /**
   * Update OS status or details
   */
  async updateServiceOrder(
    id: number,
    osData: Partial<ServiceOrder>,
    userName = 'Técnico'
  ): Promise<ServiceOrder> {
    const existing = await db.serviceOrders.get(id);
    if (!existing) {
      throw new Error(`Ordem de Serviço #${id} não encontrada.`);
    }

    const updated: ServiceOrder = {
      ...existing,
      ...osData,
      updatedAt: new Date().toISOString()
    };

    await db.serviceOrders.put(updated);

    // If new status is finalized, trigger inventory & financial processing
    if (
      (updated.status === 'concluida' || updated.status === 'entregue') &&
      (!updated.stockDeducted || !updated.receivableCreated)
    ) {
      await this.processOSFinalization(updated, userName);
    }

    return updated;
  },

  /**
   * Deduct stock for products used in OS and create Financial Account Receivable
   */
  async processOSFinalization(os: ServiceOrder, userName = 'Técnico') {
    // 1. Stock Deduction if not done yet
    if (!os.stockDeducted && os.products.length > 0) {
      for (const prod of os.products) {
        await inventoryService.updateStock(
          prod.productId,
          'os',
          prod.quantity,
          `Saída - Produto utilizado na ${os.code}`,
          'os',
          os.id,
          userName
        );
      }
      os.stockDeducted = true;
    }

    // 2. Financial Accounts Receivable Creation if not done yet
    if (!os.receivableCreated && os.total > 0) {
      const recCount = await db.accountsReceivable.count();
      const recCode = `REC #${String(recCount + 1).padStart(6, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];

      const receivable: AccountReceivable = {
        code: recCode,
        customerId: os.customerId,
        customerName: os.customerName,
        description: `Lançamento automático referente à ${os.code}`,
        amount: os.total,
        paidAmount: 0, // OS receivable starts as pending unless registered as paid
        dueDate: todayStr,
        status: 'pendente',
        originType: 'os',
        originId: os.id,
        originCode: os.code,
        category: 'Ordem de Serviço',
        createdAt: new Date().toISOString()
      };

      await db.accountsReceivable.add(receivable);
      os.receivableCreated = true;
    }

    if (!os.completionDate) {
      os.completionDate = new Date().toISOString().split('T')[0];
    }

    await db.serviceOrders.put(os);
  }
};
