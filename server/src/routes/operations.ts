import { Router } from 'express';

import { transaction } from '../database/connection.js';
import { requireAdmin, requireRole } from '../http/auth.js';
import { ValidationError } from '../http/errors.js';
import { parseId, requireObject } from '../http/params.js';
import { applyStockChange } from '../services/inventory.js';
import {
  createManualPayable,
  createManualReceivable,
  nextPayableCode,
  nextReceivableCode,
  payAccount,
  receivePayment
} from '../services/financial.js';
import { cancelSale, createSale, nextSaleCode } from '../services/sales.js';
import {
  changeStatus,
  createServiceOrder,
  nextOsCode,
  updateServiceOrder
} from '../services/serviceOrders.js';
import type { OSStatus, PaymentMethod, StockMovementType } from '../types.js';

export const operationsRouter = Router();

const STOCK_TYPES: StockMovementType[] = ['entrada', 'saida', 'ajuste', 'venda', 'os'];

const PAYMENT_METHODS: PaymentMethod[] = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'boleto',
  'transferencia',
  'fiado'
];

const OS_STATUSES: OSStatus[] = ['aberta', 'em_execucao', 'encerrada', 'cancelada'];

/* ─────────────── Vendas ─────────────── */

operationsRouter.post('/sales', requireRole('technician'), (req, res) => {
  const body = requireObject(req.body);
  const sale = createSale(body as never, String(body.sellerName ?? 'Vendedor'));
  res.status(201).json(sale);
});

operationsRouter.post('/sales/:id/cancel', requireRole('technician'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sale = cancelSale(parseId(String(req.params.id)), String(body.userName ?? 'Sistema'));
  res.json(sale);
});

/* ─────────── Ordens de serviço ─────────── */

operationsRouter.post('/service-orders', requireRole('technician'), (req, res) => {
  const body = requireObject(req.body);
  const os = createServiceOrder(body as never, String(body.userName ?? 'Técnico'));
  res.status(201).json(os);
});

operationsRouter.patch('/service-orders/:id', requireRole('technician'), (req, res) => {
  const body = requireObject(req.body);
  const os = updateServiceOrder(
    parseId(String(req.params.id)),
    body as never,
    String(body.userName ?? 'Técnico')
  );
  res.json(os);
});

operationsRouter.post('/service-orders/:id/status', requireRole('technician'), (req, res) => {
  const body = requireObject(req.body);
  const status = String(body.status ?? '') as OSStatus;

  if (!OS_STATUSES.includes(status)) {
    throw new ValidationError(`Status de OS inválido: "${String(body.status)}".`);
  }

  res.json(changeStatus(parseId(String(req.params.id)), status, String(body.userName ?? 'Técnico')));
});

/* ─────────────── Estoque ─────────────── */

operationsRouter.post('/stock-movements', requireAdmin, (req, res) => {
  const body = requireObject(req.body);
  const type = String(body.type ?? '') as StockMovementType;

  if (!STOCK_TYPES.includes(type)) {
    throw new ValidationError(`Tipo de movimentação inválido: "${String(body.type)}".`);
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new ValidationError('Informe uma quantidade válida.');
  }
  if (type !== 'ajuste' && quantity <= 0) {
    throw new ValidationError('A quantidade deve ser maior que zero.');
  }

  const reason = String(body.reason ?? '').trim();
  if (!reason) {
    throw new ValidationError('Informe o motivo da movimentação.');
  }

  const movement = transaction(() =>
    applyStockChange({
      productId: parseId(String(body.productId), 'productId'),
      type,
      quantity,
      reason,
      referenceType: 'manual',
      userName: body.userName ? String(body.userName) : undefined
    })
  );

  res.status(201).json(movement);
});

/* ─────────────── Financeiro ─────────────── */

function readPayment(body: Record<string, unknown>) {
  const method = String(body.paymentMethod ?? '') as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) {
    throw new ValidationError(`Forma de pagamento inválida: "${String(body.paymentMethod)}".`);
  }

  return {
    amount: Number(body.amount),
    paymentMethod: method,
    paymentDate: body.paymentDate ? String(body.paymentDate) : undefined
  };
}

operationsRouter.post('/receivables', requireRole('financial'), (req, res) => {
  res.status(201).json(createManualReceivable(requireObject(req.body) as never));
});

operationsRouter.post('/receivables/:id/receive', requireRole('financial'), (req, res) => {
  const payment = readPayment(requireObject(req.body));
  res.json(transaction(() => receivePayment(parseId(String(req.params.id)), payment)));
});

operationsRouter.post('/payables', requireRole('financial'), (req, res) => {
  res.status(201).json(createManualPayable(requireObject(req.body) as never));
});

operationsRouter.post('/payables/:id/pay', requireRole('financial'), (req, res) => {
  const payment = readPayment(requireObject(req.body));
  res.json(transaction(() => payAccount(parseId(String(req.params.id)), payment)));
});

/* ─────────── Códigos sequenciais ─────────── */

const codeGenerators: Record<string, () => string> = {
  sale: nextSaleCode,
  os: nextOsCode,
  receivable: nextReceivableCode,
  payable: nextPayableCode
};

operationsRouter.get('/next-code/:kind', (req, res) => {
  const generator = codeGenerators[String(req.params.kind)];

  if (!generator) {
    throw new ValidationError(
      `Tipo de código inválido. Use um destes: ${Object.keys(codeGenerators).join(', ')}.`
    );
  }

  res.json({ code: generator() });
});
