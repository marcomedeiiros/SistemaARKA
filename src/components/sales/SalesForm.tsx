import React, { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Product, Customer, SaleItem, PaymentMethod } from '../../types';
import { salesService } from '../../services/salesService';
import { formatCurrency, paymentMethodLabel, Alert } from '../common/FormComponents';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Printer } from 'lucide-react';

interface SalesFormProps {
  onClose: () => void;
  onSave: () => void;
}

interface CartItem extends SaleItem {
  productUnit: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'transferencia', 'fiado'];

export const SalesForm: React.FC<SalesFormProps> = ({ onClose, onSave }) => {
  const products = useLiveQuery(() => db.products.filter((p) => p.active).toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];

  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishedSale, setFinishedSale] = useState<any>(null);

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
  }).slice(0, 20);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.document.includes(q) || c.phone.includes(q);
  }).slice(0, 8);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice - i.discount }
            : i
        );
      }
      const item: CartItem = {
        productId: product.id!,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        productUnit: product.unit,
        quantity: 1,
        unitPrice: product.salePrice,
        discount: 0,
        subtotal: product.salePrice
      };
      return [...prev, item];
    });
    setProductSearch('');
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((p) => p.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((i) =>
      i.productId === productId
        ? { ...i, quantity: qty, subtotal: qty * i.unitPrice - i.discount }
        : i
    ));
  };

  const updateItemDiscount = (productId: number, disc: number) => {
    setCart((prev) => prev.map((i) =>
      i.productId === productId
        ? { ...i, discount: disc, subtotal: i.quantity * i.unitPrice - disc }
        : i
    ));
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartTotal = cartSubtotal - discount + surcharge;

  const handleFinalize = async () => {
    if (!selectedCustomer) { setAlert({ type: 'error', message: 'Selecione um cliente.' }); return; }
    if (cart.length === 0) { setAlert({ type: 'error', message: 'Adicione ao menos um produto.' }); return; }

    // Stock check
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.currentStock < item.quantity) {
        setAlert({ type: 'error', message: `Estoque insuficiente para "${prod.name}". Disponível: ${prod.currentStock} ${prod.unit}.` });
        return;
      }
    }

    setLoading(true);
    try {
      const sale = await salesService.createSale({
        customerId: selectedCustomer.id!,
        customerName: selectedCustomer.name,
        items: cart.map(({ productUnit, ...i }) => i),
        subtotal: cartSubtotal,
        discount,
        surcharge,
        total: cartTotal,
        paymentMethod,
        installments,
        status: 'concluida',
        notes
      });
      setFinishedSale(sale);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (finishedSale) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart size={28} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-400">Venda Finalizada!</h2>
          <p className="text-[var(--text-muted)]">{finishedSale.code}</p>
        </div>

        {/* Receipt */}
        <div className="p-5 rounded-xl space-y-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Cliente</span>
            <span className="font-medium">{finishedSale.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Forma de Pagamento</span>
            <span className="font-medium">{paymentMethodLabel[finishedSale.paymentMethod]}</span>
          </div>
          {finishedSale.installments > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Parcelamento</span>
              <span className="font-medium">{finishedSale.installments}x de {formatCurrency(finishedSale.total / finishedSale.installments)}</span>
            </div>
          )}
          <div className="border-t border-[var(--border-color)] pt-3">
            {finishedSale.items.map((i: SaleItem) => (
              <div key={i.productId} className="flex justify-between text-sm py-1">
                <span>{i.quantity}x {i.productName}</span>
                <span>{formatCurrency(i.subtotal)}</span>
              </div>
            ))}
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Desconto</span><span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-[var(--border-color)] pt-2">
            <span>TOTAL</span>
            <span className="text-green-400">{formatCurrency(finishedSale.total)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.print()} className="btn btn-secondary flex-1">
            <Printer size={15} /> Imprimir Comprovante
          </button>
          <button onClick={() => { onSave(); onClose(); }} className="btn btn-primary flex-1">
            Nova Venda / Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 h-full">
      {/* Left: Product Search */}
      <div className="flex-1 space-y-3">
        <h3 className="font-semibold text-[var(--text-main)]">Adicionar Produto</h3>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="arka-input pl-9"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nome, SKU ou código de barras..."
          />
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 && (
            <p className="text-sm text-center text-[var(--text-muted)] py-8">Nenhum produto encontrado.</p>
          )}
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid var(--border-color)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[var(--border-color)] flex items-center justify-center flex-shrink-0 text-xs text-[var(--text-muted)]">IMG</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">{p.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{p.sku} · Estoque: {p.currentStock} {p.unit}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-green-400">{formatCurrency(p.salePrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-[380px] flex flex-col gap-4">
        {/* Customer */}
        <div>
          <label className="text-sm font-medium text-[var(--text-main)] mb-1.5 block">Cliente *</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">{selectedCustomer.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 text-[var(--text-muted)] hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="arka-input"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Buscar cliente por nome ou CPF..."
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--border-color)]/50 transition"
                    >
                      <p className="font-medium text-[var(--text-main)]">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{c.document} · {c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
              <ShoppingCart size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Carrinho vazio. Adicione produtos.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-main)] leading-tight">{item.productName}</p>
                  <button onClick={() => updateQty(item.productId, 0)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--border-color)]/70">
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                      className="w-12 text-center text-sm border border-[var(--border-color)] rounded-lg py-0.5 bg-[var(--bg-card)] text-[var(--text-main)]"
                    />
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded-lg bg-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--border-color)]/70">
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--text-muted)]">{formatCurrency(item.unitPrice)} × {item.quantity}</span>
                    <p className="font-bold text-sm text-green-400">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Payment */}
        <div className="space-y-3 border-t border-[var(--border-color)] pt-3">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Desconto (R$)</label>
              <input type="number" min="0" step="0.01" className="arka-input mt-1 text-sm" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Acréscimo (R$)</label>
              <input type="number" min="0" step="0.01" className="arka-input mt-1 text-sm" value={surcharge} onChange={(e) => setSurcharge(Number(e.target.value))} />
            </div>
          </div>

          <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-400 mb-1">
                <span>Desconto</span><span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl">
              <span className="text-[var(--text-main)]">TOTAL</span>
              <span className="text-green-400">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Forma de Pagamento</label>
            <select className="arka-select mt-1 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{paymentMethodLabel[m]}</option>)}
            </select>
          </div>

          {paymentMethod === 'cartao_credito' && (
            <div>
              <label className="text-xs text-[var(--text-muted)]">Parcelas</label>
              <select className="arka-select mt-1 text-sm" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x de {formatCurrency(cartTotal / n)}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleFinalize}
            disabled={loading || cart.length === 0}
            className="btn btn-success w-full text-base py-3"
          >
            {loading ? 'Finalizando...' : `Finalizar Venda · ${formatCurrency(cartTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
