import React from 'react';
import { Sale, SaleItem } from '../../types';
import { formatCurrency, paymentMethodLabel } from '../common/FormComponents';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Recibo de Venda #{sale.code}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data</p>
              <p className="font-medium">{new Date(sale.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{sale.status === 'completed' ? 'Concluída' : sale.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium">{sale.customerName || 'Cliente Padrão'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendedor</p>
              <p className="font-medium">{sale.sellerName || 'Sistema'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2 border-b pb-1">Itens da Venda</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Produto</th>
                  <th className="py-2 text-right">Qtd</th>
                  <th className="py-2 text-right">Preço Unit.</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item: SaleItem, index: number) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2">{item.productName}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <h3 className="font-semibold mb-2">Pagamento</h3>
              <p className="text-sm text-gray-600">Método: {paymentMethodLabel(sale.paymentMethod)}</p>
              {sale.paymentMethod === 'cartao_credito' && (
                <p className="text-sm text-gray-600">Parcelas: {sale.installments}x</p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-gray-600">Subtotal: {formatCurrency(sale.subtotal)}</p>
              <p className="text-sm text-gray-600">Desconto: {formatCurrency(sale.discount)}</p>
              <p className="text-sm text-gray-600">Acréscimo: {formatCurrency(sale.surcharge)}</p>
              <p className="text-lg font-bold mt-2">Total: {formatCurrency(sale.total)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
