import { db } from '../db/db';
import { StockMovement, StockMovementType } from '../types';

export const inventoryService = {
  /**
   * Adjust product stock level and log movement
   */
  async updateStock(
    productId: number,
    type: StockMovementType,
    quantity: number,
    reason: string,
    referenceType: 'sale' | 'os' | 'manual' = 'manual',
    referenceId?: number,
    userName = 'Sistema'
  ): Promise<boolean> {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error(`Produto #${productId} não encontrado.`);
    }

    const settingsList = await db.companySettings.toArray();
    const settings = settingsList[0];
    const allowNegative = settings ? settings.allowNegativeStock : false;

    let newStock = product.currentStock;
    const qty = Math.abs(quantity);

    if (type === 'entrada') {
      newStock += qty;
    } else if (type === 'saida' || type === 'venda' || type === 'os') {
      if (!allowNegative && product.currentStock < qty) {
        throw new Error(
          `Estoque insuficiente para o produto "${product.name}". Atual: ${product.currentStock}, Solicitado: ${qty}.`
        );
      }
      newStock -= qty;
    } else if (type === 'ajuste') {
      newStock = qty;
    }

    if (newStock < 0 && !allowNegative) {
      throw new Error(`Estoque negativo não permitido para "${product.name}".`);
    }

    const previousStock = product.currentStock;
    product.currentStock = newStock;
    product.updatedAt = new Date().toISOString();

    await db.products.put(product);

    const movement: StockMovement = {
      productId: product.id!,
      productName: product.name,
      type,
      quantity: qty,
      previousStock,
      newStock,
      reason,
      referenceType,
      referenceId,
      userName,
      createdAt: new Date().toISOString()
    };

    await db.stockMovements.add(movement);
    return true;
  },

  /**
   * Get products with low stock (currentStock <= minStock)
   */
  async getLowStockProducts() {
    const allProducts = await db.products.filter((p) => p.active).toArray();
    return allProducts.filter((p) => p.currentStock <= p.minStock);
  },

  /**
   * Get stock movement history for a specific product
   */
  async getProductMovements(productId: number) {
    return db.stockMovements.where('productId').equals(productId).reverse().sortBy('createdAt');
  }
};
