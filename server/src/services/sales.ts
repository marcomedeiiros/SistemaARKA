import { transaction } from '../database/connection.js';
import { repositories } from '../database/repositories.js';
import { ConflictError, NotFoundError, ValidationError } from '../http/errors.js';
import { nextSequentialCode } from './codes.js';
import { applyStockChange, assertStockAvailable } from './inventory.js';
import { nextReceivableCode } from './financial.js';
import type { Sale, SaleItem } from '../types.js';

const today = () => new Date().toISOString().split('T')[0]!;

export function nextSaleCode(): string {
  return nextSequentialCode(repositories.sales, 'Venda');
}

export type CreateSaleInput = Omit<Sale, 'id' | 'code' | 'createdAt' | 'status'> & {
  status?: Sale['status'];
};

function validateSale(input: CreateSaleInput): SaleItem[] {
  if (!input.customerId) {
    throw new ValidationError('Selecione um cliente para a venda.');
  }

  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    throw new ValidationError('Adicione ao menos um produto à venda.');
  }

  for (const item of items) {
    if (!item.productId) {
      throw new ValidationError('Todos os itens precisam de um produto válido.');
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new ValidationError(`Quantidade inválida para "${item.productName}".`);
    }
  }

  if (!Number.isFinite(input.total) || input.total < 0) {
    throw new ValidationError('O total da venda é inválido.');
  }

  return items;
}

/**
 * Registra a venda, baixa o estoque de cada item e gera a conta a receber.
 * Tudo em uma transação: se qualquer etapa falhar, nada é persistido.
 */
export function createSale(input: CreateSaleInput, sellerName = 'Vendedor'): Sale {
  const items = validateSale(input);

  return transaction(() => {
    assertStockAvailable(items);

    const code = nextSaleCode();
    const now = new Date().toISOString();

    const sale = repositories.sales.insert({
      ...input,
      code,
      status: 'concluida',
      sellerName: input.sellerName ?? sellerName,
      createdAt: now
    });

    for (const item of items) {
      applyStockChange({
        productId: item.productId,
        type: 'venda',
        quantity: item.quantity,
        reason: `Saída - Venda ${code}`,
        referenceType: 'sale',
        referenceId: sale.id!,
        userName: sale.sellerName ?? sellerName
      });
    }

    const isFiado = input.paymentMethod === 'fiado';
    const dueDate = isFiado
      ? new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]!
      : today();

    repositories.accountsReceivable.insert({
      code: nextReceivableCode(),
      customerId: input.customerId,
      customerName: input.customerName,
      description: `Lançamento referente à ${code}`,
      amount: input.total,
      paidAmount: isFiado ? 0 : input.total,
      dueDate,
      paymentDate: isFiado ? undefined : today(),
      paymentMethod: input.paymentMethod,
      status: isFiado ? 'pendente' : 'pago',
      originType: 'sale',
      originId: sale.id!,
      originCode: code,
      category: 'Vendas',
      createdAt: now
    });

    return sale;
  });
}

/**
 * Cancela uma venda sem apagar o histórico: marca o status como `cancelada`,
 * devolve os itens ao estoque e cancela a conta a receber correspondente.
 */
export function cancelSale(id: number, userName = 'Sistema'): Sale {
  return transaction(() => {
    const sale = repositories.sales.findById(id);
    if (!sale) throw new NotFoundError('Venda não encontrada.');

    if (sale.status === 'cancelada') {
      throw new ConflictError('Esta venda já está cancelada.');
    }

    for (const item of sale.items) {
      applyStockChange({
        productId: item.productId,
        type: 'entrada',
        quantity: item.quantity,
        reason: `Estorno - Cancelamento da ${sale.code}`,
        referenceType: 'sale',
        referenceId: sale.id!,
        userName
      });
    }

    const receivables = repositories.accountsReceivable
      .findAll()
      .filter((account) => account.originType === 'sale' && account.originId === sale.id);

    for (const account of receivables) {
      repositories.accountsReceivable.update(account.id!, {
        status: 'cancelado',
        notes: [account.notes, `Cancelado junto com a ${sale.code}.`]
          .filter(Boolean)
          .join(' ')
      });
    }

    return repositories.sales.update(id, { status: 'cancelada' })!;
  });
}
