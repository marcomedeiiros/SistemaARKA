import { repositories } from '../database/repositories.js';
import { ConflictError, NotFoundError } from '../http/errors.js';
import type { CompanySettings, StockMovement, StockMovementType } from '../types.js';

export interface StockChange {
  productId: number;
  type: StockMovementType;
  quantity: number;
  reason: string;
  referenceType?: 'sale' | 'os' | 'manual';
  referenceId?: number;
  userName?: string;
}

export function getCompanySettings(): CompanySettings | undefined {
  return repositories.companySettings.findAll()[0];
}

function negativeStockAllowed(): boolean {
  return getCompanySettings()?.allowNegativeStock === true;
}

/**
 * Aplica uma movimentação de estoque e registra a auditoria.
 *
 * `entrada` soma, `saida`/`venda`/`os` subtraem e `ajuste` define o saldo
 * absoluto. Deve ser chamado dentro de uma transação quando fizer parte de
 * uma operação composta (venda, OS).
 */
export function applyStockChange(change: StockChange): StockMovement {
  const product = repositories.products.findById(change.productId);
  if (!product) {
    throw new NotFoundError(`Produto #${change.productId} não encontrado.`);
  }

  const quantity = Math.abs(Number(change.quantity) || 0);
  const previousStock = product.currentStock;
  let newStock = previousStock;

  switch (change.type) {
    case 'entrada':
      newStock = previousStock + quantity;
      break;
    case 'saida':
    case 'venda':
    case 'os':
      newStock = previousStock - quantity;
      break;
    case 'ajuste':
      newStock = quantity;
      break;
  }

  if (newStock < 0 && !negativeStockAllowed()) {
    throw new ConflictError(
      `Estoque insuficiente para "${product.name}". Atual: ${previousStock}, solicitado: ${quantity}.`
    );
  }

  const now = new Date().toISOString();

  repositories.products.update(product.id!, {
    currentStock: newStock,
    updatedAt: now
  });

  return repositories.stockMovements.insert({
    productId: product.id!,
    productName: product.name,
    type: change.type,
    quantity,
    previousStock,
    newStock,
    reason: change.reason,
    referenceType: change.referenceType ?? 'manual',
    referenceId: change.referenceId,
    userName: change.userName ?? 'Sistema',
    createdAt: now
  });
}

/** Valida se há saldo para todos os itens antes de iniciar uma baixa em lote. */
export function assertStockAvailable(
  items: { productId: number; quantity: number }[]
): void {
  if (negativeStockAllowed()) return;

  const required = new Map<number, number>();
  for (const item of items) {
    required.set(item.productId, (required.get(item.productId) ?? 0) + Math.abs(item.quantity));
  }

  for (const [productId, quantity] of required) {
    const product = repositories.products.findById(productId);
    if (!product) {
      throw new NotFoundError(`Produto #${productId} não encontrado no estoque.`);
    }
    if (product.currentStock < quantity) {
      throw new ConflictError(
        `Estoque insuficiente para "${product.name}". Disponível: ${product.currentStock} ${product.unit}, solicitado: ${quantity}.`
      );
    }
  }
}

export function getLowStockProducts() {
  return repositories.products
    .findAll()
    .filter((product) => product.active && product.currentStock <= product.minStock);
}
