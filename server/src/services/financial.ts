import { repositories } from '../database/repositories.js';
import { NotFoundError, ValidationError } from '../http/errors.js';
import { nextSequentialCode } from './codes.js';
import type { AccountPayable, AccountReceivable, PaymentMethod } from '../types.js';

const today = () => new Date().toISOString().split('T')[0]!;

export function nextReceivableCode(): string {
  return nextSequentialCode(repositories.accountsReceivable, 'REC');
}

export function nextPayableCode(): string {
  return nextSequentialCode(repositories.accountsPayable, 'PAG');
}

export interface PaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
}

function resolveStatus(paidAmount: number, amount: number): 'pago' | 'pendente' {
  return paidAmount >= amount ? 'pago' : 'pendente';
}

/** Baixa (total ou parcial) em uma conta a receber. */
export function receivePayment(id: number, input: PaymentInput): AccountReceivable {
  const account = repositories.accountsReceivable.findById(id);
  if (!account) throw new NotFoundError('Conta a receber não encontrada.');

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('O valor do recebimento deve ser maior que zero.');
  }

  const outstanding = account.amount - (account.paidAmount || 0);
  if (outstanding <= 0) {
    throw new ValidationError('Esta conta já está totalmente quitada.');
  }
  if (amount > outstanding + 0.005) {
    throw new ValidationError(
      `O valor informado excede o saldo em aberto de ${outstanding.toFixed(2)}.`
    );
  }

  const paidAmount = Math.min(account.amount, (account.paidAmount || 0) + amount);

  return repositories.accountsReceivable.update(id, {
    paidAmount,
    paymentMethod: input.paymentMethod,
    paymentDate: input.paymentDate ?? today(),
    status: resolveStatus(paidAmount, account.amount)
  })!;
}

/** Baixa (total ou parcial) em uma conta a pagar. */
export function payAccount(id: number, input: PaymentInput): AccountPayable {
  const account = repositories.accountsPayable.findById(id);
  if (!account) throw new NotFoundError('Conta a pagar não encontrada.');

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('O valor do pagamento deve ser maior que zero.');
  }

  const outstanding = account.amount - (account.paidAmount || 0);
  if (outstanding <= 0) {
    throw new ValidationError('Esta conta já está totalmente quitada.');
  }
  if (amount > outstanding + 0.005) {
    throw new ValidationError(
      `O valor informado excede o saldo em aberto de ${outstanding.toFixed(2)}.`
    );
  }

  const paidAmount = Math.min(account.amount, (account.paidAmount || 0) + amount);

  return repositories.accountsPayable.update(id, {
    paidAmount,
    paymentMethod: input.paymentMethod,
    paymentDate: input.paymentDate ?? today(),
    status: resolveStatus(paidAmount, account.amount)
  })!;
}

export interface ManualReceivableInput {
  customerId?: number;
  customerName: string;
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  notes?: string;
}

/** Lançamento manual de conta a receber (sem venda ou OS de origem). */
export function createManualReceivable(input: ManualReceivableInput): AccountReceivable {
  if (!input.customerName?.trim()) {
    throw new ValidationError('Informe o cliente.');
  }
  if (!input.description?.trim()) {
    throw new ValidationError('Informe a descrição do lançamento.');
  }
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    throw new ValidationError('O valor deve ser maior que zero.');
  }
  if (!input.dueDate) {
    throw new ValidationError('Informe a data de vencimento.');
  }

  return repositories.accountsReceivable.insert({
    code: nextReceivableCode(),
    customerId: input.customerId ?? 0,
    customerName: input.customerName.trim(),
    description: input.description.trim(),
    amount: Number(input.amount),
    paidAmount: 0,
    dueDate: input.dueDate,
    status: 'pendente',
    originType: 'manual',
    category: input.category?.trim() || 'Avulso',
    notes: input.notes,
    createdAt: new Date().toISOString()
  });
}

export interface ManualPayableInput {
  supplierId?: number;
  supplierName: string;
  description: string;
  category?: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

/** Lançamento manual de conta a pagar. */
export function createManualPayable(input: ManualPayableInput): AccountPayable {
  if (!input.supplierName?.trim()) {
    throw new ValidationError('Informe o fornecedor ou credor.');
  }
  if (!input.description?.trim()) {
    throw new ValidationError('Informe a descrição da conta.');
  }
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    throw new ValidationError('O valor deve ser maior que zero.');
  }
  if (!input.dueDate) {
    throw new ValidationError('Informe a data de vencimento.');
  }

  return repositories.accountsPayable.insert({
    code: nextPayableCode(),
    supplierId: input.supplierId,
    supplierName: input.supplierName.trim(),
    description: input.description.trim(),
    category: input.category?.trim() || 'Outros',
    amount: Number(input.amount),
    paidAmount: 0,
    dueDate: input.dueDate,
    status: 'pendente',
    notes: input.notes,
    createdAt: new Date().toISOString()
  });
}

/** Marca como `vencido` todo título pendente cuja data de vencimento já passou. */
export function refreshOverdueStatus(): number {
  const reference = today();
  let updated = 0;

  for (const account of repositories.accountsReceivable.findAll()) {
    if (account.status === 'pendente' && account.dueDate < reference) {
      repositories.accountsReceivable.update(account.id!, { status: 'vencido' });
      updated += 1;
    }
  }

  for (const account of repositories.accountsPayable.findAll()) {
    if (account.status === 'pendente' && account.dueDate < reference) {
      repositories.accountsPayable.update(account.id!, { status: 'vencido' });
      updated += 1;
    }
  }

  return updated;
}
