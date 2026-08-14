import React from 'react';
import { Sale, SaleItem } from '../../types';
import { formatCurrency, formatDate, paymentMethodLabel } from '../common/FormComponents';
import { Printer, X } from 'lucide-react';

interface SaleDetailProps {
  sale: Sale;
  onClose: () => void;
}

export default function SaleDetail({ sale, onClose }: SaleDetailProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Recibo de Venda #{sale.code}</h2>
            <p className="text-xs text-[var(--text-muted)]">{formatDate(sale.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Fechar"
            >
              <X className="w-4 h-4" /> Fechar
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible">
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Data / Hora</p>
              <p className="font-semibold text-xs sm:text-sm">{new Date(sale.createdAt).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Status</p>
              <span className={`badge ${sale.status === 'concluida' ? 'badge-green' : 'badge-red'}`}>
                {sale.status === 'concluida' ? 'Concluída' : 'Cancelada'}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Cliente</p>
              <p className="font-semibold text-xs sm:text-sm truncate">{sale.customerName || 'Consumidor Final'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Vendedor</p>
              <p className="font-semibold text-xs sm:text-sm truncate">{sale.sellerName || 'Operador'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 border-b border-[var(--border-color)] pb-1">
              Itens da Venda
            </h3>
            <div className="overflow-x-auto">
              <table className="arka-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">V. Unit</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item: SaleItem, index: number) => (
                    <tr key={index}>
                      <td className="font-medium text-xs sm:text-sm">{item.productName}</td>
                      <td className="text-center text-xs">{item.quantity}</td>
                      <td className="text-right text-xs">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-semibold text-xs sm:text-sm">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border-color)] pt-4">
            <div className="space-y-1">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Pagamento</h3>
              <p className="text-xs sm:text-sm">Método: <span className="font-semibold">{paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</span></p>
              {sale.paymentMethod === 'cartao_credito' && (
                <p className="text-xs text-[var(--text-muted)]">Parcelado em: {sale.installments}x</p>
              )}
            </div>
            <div className="text-left sm:text-right space-y-1 text-xs sm:text-sm">
              <p className="text-[var(--text-muted)]">Subtotal: <span className="font-medium text-[var(--text-main)]">{formatCurrency(sale.subtotal)}</span></p>
              <p className="text-[var(--text-muted)]">Desconto: <span className="font-medium text-red-400">- {formatCurrency(sale.discount)}</span></p>
              <p className="text-[var(--text-muted)]">Acréscimo: <span className="font-medium text-blue-400">+ {formatCurrency(sale.surcharge)}</span></p>
              <p className="text-lg font-extrabold text-emerald-400 mt-2">Total: {formatCurrency(sale.total)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
