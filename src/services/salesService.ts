import { db } from '../db/db';
import { Sale, AccountReceivable } from '../types';
import { inventoryService } from './inventoryService';

export const salesService = {
  /**
   * Generates next code like Venda #000003
   */
  async generateSaleCode(): Promise<string> {
    const count = await db.sales.count();
    const nextNum = count + 1;
    return `Venda #${String(nextNum).padStart(6, '0')}`;
  },

  /**
   * Finalize and register a POS Sale
   */
  async createSale(saleData: Omit<Sale, 'id' | 'code' | 'createdAt'>, sellerName = 'Vendedor'): Promise<Sale> {
    // 1. Verify and deduct inventory for each item
    for (const item of saleData.items) {
      const product = await db.products.get(item.productId);
      if (!product) {
        throw new Error(`Produto #${item.productId} não foi encontrado no estoque.`);
      }
    }

    const code = await this.generateSaleCode();
    const now = new Date().toISOString();

    const sale: Sale = {
      ...saleData,
      code,
      status: 'concluida',
      createdAt: now
    };

    const saleId = await db.sales.add(sale);
    sale.id = saleId;

    // 2. Perform Stock Deductions
    for (const item of saleData.items) {
      await inventoryService.updateStock(
        item.productId,
        'venda',
        item.quantity,
        `Saída - Venda ${code}`,
        'sale',
        saleId,
        sellerName
      );
    }

    // 3. Auto-generate Financial Account Receivable
    const isFiado = saleData.paymentMethod === 'fiado';
    const recCount = await db.accountsReceivable.count();
    const recCode = `REC #${String(recCount + 1).padStart(6, '0')}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueDate = isFiado
      ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      : todayStr;

    const receivable: AccountReceivable = {
      code: recCode,
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      description: `Lançamento referente à ${code}`,
      amount: saleData.total,
      paidAmount: isFiado ? 0 : saleData.total,
      dueDate,
      paymentDate: isFiado ? undefined : todayStr,
      paymentMethod: saleData.paymentMethod,
      status: isFiado ? 'pendente' : 'pago',
      originType: 'sale',
      originId: saleId,
      originCode: code,
      category: 'Vendas',
      createdAt: now
    };

    await db.accountsReceivable.add(receivable);

    return sale;
  }
};
