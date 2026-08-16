import { db } from '../data/store';
import { operations } from '../data/operations';
import { StockMovement, StockMovementType } from '../types';

/**
 * Estoque.
 *
 * A movimentação é gravada pelo servidor, que valida saldo (respeitando a
 * configuração "permitir estoque negativo"), atualiza o produto e registra a
 * auditoria na mesma transação.
 */
export const inventoryService = {
  updateStock(
    productId: number,
    type: StockMovementType,
    quantity: number,
    reason: string,
    userName = 'Sistema'
  ): Promise<StockMovement> {
    return operations.registerStockMovement({ productId, type, quantity, reason, userName });
  },

  /** Produtos ativos cujo saldo atingiu ou passou do estoque mínimo. */
  async getLowStockProducts() {
    const products = await db.products.filter((product) => product.active).toArray();
    return products.filter((product) => product.currentStock <= product.minStock);
  },

  /** Histórico de movimentações de um produto, da mais recente para a mais antiga. */
  getProductMovements(productId: number) {
    return db.stockMovements.where('productId').equals(productId).reverse().sortBy('createdAt');
  }
};
