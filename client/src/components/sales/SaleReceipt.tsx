import React from 'react';
import { Printer, X } from 'lucide-react';

import { db } from '../../db/db';
import { useLiveQuery } from '../../data/useLiveQuery';
import { Modal } from '../common/Modal';
import { Sale } from '../../types';
import { documentLogoProps } from '../../lib/brand';
import { formatCurrency, formatDate, paymentMethodLabel } from '../common/FormComponents';

interface SaleReceiptProps {
  sale: Sale;
  onClose: () => void;
}

/**
 * Comprovante de venda em modal, pronto para impressão.
 *
 * O bloco imprimível é marcado com `print-root`: na impressão o CSS esconde a
 * interface e mantém apenas esse conteúdo. Antes não funcionava porque o
 * overlay do modal inteiro era marcado como `no-print`, então o comprovante
 * desaparecia e o navegador imprimia a tela de trás.
 */
export const SaleReceipt: React.FC<SaleReceiptProps> = ({ sale, onClose }) => {
  const company = useLiveQuery(() => db.companySettings.toCollection().first(), []);

  const isCanceled = sale.status === 'cancelada';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Comprovante · ${sale.code}`}
      description={formatDate(sale.createdAt)}
      maxWidth="2xl"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            <X size={15} /> Fechar
          </button>
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={15} /> Imprimir
          </button>
        </>
      }
    >
      <div className="print-root doc">
        <header className="doc-header">
          <div className="min-w-0">
            {/* A logo identifica a empresa no documento; não repetimos o nome em
                texto logo abaixo dela. */}
            <img
              {...documentLogoProps(company?.logoUrl)}
              alt={company?.tradeName || company?.name || 'Arka Tecnologia'}
            />
            {company?.cnpj && <p className="doc-meta">CNPJ: {company.cnpj}</p>}
            {company?.address && (
              <p className="doc-meta">
                {company.address}
                {company.city ? ` · ${company.city}/${company.state}` : ''}
              </p>
            )}
            {company?.phone && <p className="doc-meta">Tel: {company.phone}</p>}
          </div>

          <div className="doc-header-right">
            <p className="doc-kind">Comprovante de Venda</p>
            <p className="doc-code">{sale.code}</p>
            <span className={`badge ${isCanceled ? 'badge-red' : 'badge-green'} w-fit`}>
              {isCanceled ? 'Cancelada' : 'Concluída'}
            </span>
          </div>
        </header>

        {isCanceled && (
          <p className="doc-warning">
            Venda cancelada: os itens retornaram ao estoque e a conta a receber vinculada
            foi cancelada.
          </p>
        )}

        <section className="doc-section">
          <h3 className="doc-section-title">Dados da venda</h3>
          <dl className="doc-facts">
            <div>
              <dt>Cliente</dt>
              <dd>{sale.customerName || 'Consumidor final'}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{formatDate(sale.createdAt)}</dd>
            </div>
            <div>
              <dt>Pagamento</dt>
              <dd>{paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</dd>
            </div>
            <div>
              <dt>Vendedor</dt>
              <dd>{sale.sellerName || 'Operador'}</dd>
            </div>
            {sale.installments > 1 && (
              <div>
                <dt>Parcelamento</dt>
                <dd>
                  {sale.installments}x de {formatCurrency(sale.total / sale.installments)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <div className="mt-4 overflow-x-auto">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th className="text-center">Qtd.</th>
                <th className="text-right">Unit.</th>
                <th className="text-right">Desc.</th>
                <th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={`${item.productId}-${index}`}>
                  <td>{item.productName}</td>
                  <td className="font-mono text-[0.68rem]">{item.sku || '-'}</td>
                  <td className="text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="text-right tabular">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right tabular">
                    {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                  </td>
                  <td className="text-right font-semibold tabular">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="doc-totals">
          <div>
            <span>Subtotal</span>
            <span className="tabular">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="doc-totals-negative">
              <span>Desconto</span>
              <span className="tabular">-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          {sale.surcharge > 0 && (
            <div>
              <span>Acréscimo</span>
              <span className="tabular">+{formatCurrency(sale.surcharge)}</span>
            </div>
          )}
          <div className="doc-totals-grand">
            <span>Total</span>
            <span className="tabular">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {sale.notes && (
          <p className="doc-notes">
            <strong>Observações:</strong> {sale.notes}
          </p>
        )}

        {company?.termsAndConditions && (
          <p className="doc-terms">{company.termsAndConditions}</p>
        )}
      </div>
    </Modal>
  );
};
