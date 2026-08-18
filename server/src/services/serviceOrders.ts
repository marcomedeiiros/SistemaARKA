import { transaction } from '../database/connection.js';
import { repositories } from '../database/repositories.js';
import { NotFoundError, ValidationError } from '../http/errors.js';
import { nextSequentialCode } from './codes.js';
import { applyStockChange, assertStockAvailable } from './inventory.js';
import { nextReceivableCode } from './financial.js';
import type { OSStatus, ServiceOrder } from '../types.js';

const today = () => new Date().toISOString().split('T')[0]!;

const FINALIZED: OSStatus[] = ['encerrada'];

export function nextOsCode(): string {
  return nextSequentialCode(repositories.serviceOrders, 'OS');
}

export type CreateServiceOrderInput = Omit<
  ServiceOrder,
  'id' | 'code' | 'createdAt' | 'updatedAt' | 'stockDeducted' | 'receivableCreated'
>;

function validate(input: Partial<CreateServiceOrderInput>): void {
  if (!input.customerId) {
    throw new ValidationError('Selecione o cliente da ordem de serviço.');
  }
  if (!input.openingDate) {
    throw new ValidationError('Informe a data de abertura.');
  }
  if (!input.problemDescription?.trim()) {
    throw new ValidationError('Descreva o problema relatado pelo cliente.');
  }
}

export function createServiceOrder(
  input: CreateServiceOrderInput,
  userName = 'Técnico'
): ServiceOrder {
  validate(input);

  return transaction(() => {
    const now = new Date().toISOString();

    const created = repositories.serviceOrders.insert({
      ...input,
      code: nextOsCode(),
      products: input.products ?? [],
      services: input.services ?? [],
      stockDeducted: false,
      receivableCreated: false,
      createdAt: now,
      updatedAt: now
    });

    if (FINALIZED.includes(created.status)) {
      return finalize(created.id!, userName);
    }

    return created;
  });
}

export function updateServiceOrder(
  id: number,
  patch: Partial<CreateServiceOrderInput>,
  userName = 'Técnico'
): ServiceOrder {
  return transaction(() => {
    const existing = repositories.serviceOrders.findById(id);
    if (!existing) {
      throw new NotFoundError(`Ordem de serviço #${id} não encontrada.`);
    }

    const merged = { ...existing, ...patch };
    validate(merged);

    const updated = repositories.serviceOrders.update(id, {
      ...patch,
      updatedAt: new Date().toISOString()
    })!;

    const shouldFinalize =
      FINALIZED.includes(updated.status) &&
      (!updated.stockDeducted || !updated.receivableCreated);

    return shouldFinalize ? finalize(id, userName) : updated;
  });
}

/**
 * Fecha a OS: dá baixa nas peças usadas (uma única vez) e gera a conta a
 * receber (uma única vez). Idempotente as flags `stockDeducted` e
 * `receivableCreated` evitam baixa ou cobrança em duplicidade.
 */
export function finalize(id: number, userName = 'Técnico'): ServiceOrder {
  const os = repositories.serviceOrders.findById(id);
  if (!os) throw new NotFoundError(`Ordem de serviço #${id} não encontrada.`);

  const patch: Partial<ServiceOrder> = { updatedAt: new Date().toISOString() };

  if (!os.stockDeducted && os.products.length > 0) {
    assertStockAvailable(os.products);

    for (const product of os.products) {
      applyStockChange({
        productId: product.productId,
        type: 'os',
        quantity: product.quantity,
        reason: `Saída - Produto utilizado na ${os.code}`,
        referenceType: 'os',
        referenceId: os.id!,
        userName
      });
    }

    patch.stockDeducted = true;
  }

  if (!os.receivableCreated && os.total > 0) {
    repositories.accountsReceivable.insert({
      code: nextReceivableCode(),
      customerId: os.customerId,
      customerName: os.customerName,
      description: `Lançamento automático referente à ${os.code}`,
      amount: os.total,
      paidAmount: 0,
      dueDate: today(),
      status: 'pendente',
      originType: 'os',
      originId: os.id!,
      originCode: os.code,
      category: 'Ordem de Serviço',
      createdAt: new Date().toISOString()
    });

    patch.receivableCreated = true;
  }

  if (!os.completionDate) {
    patch.completionDate = today();
  }

  return repositories.serviceOrders.update(id, patch)!;
}

/** Troca apenas o status, disparando o fechamento quando aplicável. */
export function changeStatus(
  id: number,
  status: OSStatus,
  userName = 'Técnico'
): ServiceOrder {
  return updateServiceOrder(id, { status } as Partial<CreateServiceOrderInput>, userName);
}
