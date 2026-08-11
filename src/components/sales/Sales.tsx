import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Sale } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, StatCard, formatCurrency, formatDate, paymentMethodLabel } from '../common/FormComponents';
import { SalesForm } from './SalesForm';
import { Plus, ShoppingCart, TrendingUp, DollarSign, Calendar, Eye, Trash2, Printer } from 'lucide-react';

export const Sales: React.FC = () => {
  const sales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStr = monthStart.toISOString().split('T')[0];

  const filteredSales = sales.filter((s) => {
    const date = s.createdAt.split('T')[0];
    if (dateFilter === 'today') return date === todayStr;
    if (dateFilter === 'week') return date >= weekAgo;
    if (dateFilter === 'month') return date >= monthStr;
    return true;
  });

  const totalRevenue = filteredSales.reduce((s, v) => s + v.total, 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((s, v) => s + v.total, 0);

  const handleDelete = async (s: Sale) => {
    if (window.confirm(`Cancelar a ${s.code}? Esta ação não pode ser desfeita.`)) {
      await db.sales.delete(s.id!);
    }
  };

  const columns = [
    {
      header: 'Código',
      key: 'code',
      render: (s: Sale) => <span className="font-mono text-xs text-purple-400 font-semibold">{s.code}</span>
    },
    {
      header: 'Data',
      key: 'createdAt',
      render: (s: Sale) => formatDate(s.createdAt)
    },
    {
      header: 'Cliente',
      key: 'customerName',
      render: (s: Sale) => <span className="font-medium">{s.customerName}</span>
    },
    {
      header: 'Itens',
      key: 'items',
      render: (s: Sale) => `${s.items.length} produto(s)`
    },
    {
      header: 'Pagamento',
      key: 'paymentMethod',
      render: (s: Sale) => (
        <span>
          {paymentMethodLabel[s.paymentMethod]}
          {s.installments > 1 && <span className="text-xs text-[var(--text-muted)]"> ({s.installments}x)</span>}
        </span>
      )
    },
    {
      header: 'Total',
      key: 'total',
      render: (s: Sale) => <span className="font-bold text-green-400">{formatCurrency(s.total)}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (s: Sale) => (
        <span className={`badge ${s.status === 'concluida' ? 'badge-green' : 'badge-red'}`}>
          {s.status === 'concluida' ? 'Concluída' : 'Cancelada'}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 animate-fade-in space-y-5">
      <SectionTitle
        title="Vendas / PDV"
        subtitle={`${filteredSales.length} venda(s) no período selecionado`}
        action={
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={16} /> Nova Venda
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Vendas" value={filteredSales.length} icon={<ShoppingCart size={20} />} color="purple" />
        <StatCard title="Faturamento Total" value={formatCurrency(totalRevenue)} icon={<DollarSign size={20} />} color="green" />
        <StatCard title="Ticket Médio" value={formatCurrency(avgTicket)} icon={<TrendingUp size={20} />} color="blue" />
        <StatCard title="Faturamento Hoje" value={formatCurrency(todayRevenue)} icon={<Calendar size={20} />} color="amber" />
      </div>

      {/* Date Filter */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--border-color)' }}>
        {[
          { key: 'all', label: 'Todas' },
          { key: 'today', label: 'Hoje' },
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mês' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key as any)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: dateFilter === f.key ? 'var(--bg-card)' : 'transparent',
              color: dateFilter === f.key ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: dateFilter === f.key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={filteredSales}
          searchPlaceholder="Buscar por código, cliente..."
          searchFields={['code', 'customerName']}
          emptyMessage="Nenhuma venda encontrada. Clique em '+ Nova Venda' para começar."
          actions={(s: Sale) => (
            <>
              <button
                onClick={() => setViewSale(s)}
                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition"
                title="Ver Detalhes"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={() => handleDelete(s)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                title="Cancelar Venda"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* New Sale Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nova Venda / PDV" maxWidth="full">
        <SalesForm onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      </Modal>

      {/* View Sale Modal */}
      {viewSale && (
        <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title={`Detalhes - ${viewSale.code}`} maxWidth="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-muted)]">Cliente:</span> <span className="font-medium ml-1">{viewSale.customerName}</span></div>
              <div><span className="text-[var(--text-muted)]">Data:</span> <span className="ml-1">{formatDate(viewSale.createdAt)}</span></div>
              <div><span className="text-[var(--text-muted)]">Pagamento:</span> <span className="ml-1">{paymentMethodLabel[viewSale.paymentMethod]}</span></div>
              {viewSale.installments > 1 && (
                <div><span className="text-[var(--text-muted)]">Parcelas:</span> <span className="ml-1">{viewSale.installments}x de {formatCurrency(viewSale.total / viewSale.installments)}</span></div>
              )}
            </div>
            <table className="arka-table">
              <thead>
                <tr><th>Produto</th><th>SKU</th><th>Qtd.</th><th>Unit.</th><th>Desc.</th><th>Total</th></tr>
              </thead>
              <tbody>
                {viewSale.items.map((i) => (
                  <tr key={i.productId}>
                    <td>{i.productName}</td>
                    <td className="text-xs text-[var(--text-muted)]">{i.sku}</td>
                    <td>{i.quantity}</td>
                    <td>{formatCurrency(i.unitPrice)}</td>
                    <td className="text-red-400">{i.discount > 0 ? `-${formatCurrency(i.discount)}` : '-'}</td>
                    <td className="font-bold">{formatCurrency(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
              {viewSale.discount > 0 && (
                <p className="text-sm text-red-400">Desconto: -{formatCurrency(viewSale.discount)}</p>
              )}
              <p className="text-xl font-bold text-green-400 ml-auto">TOTAL: {formatCurrency(viewSale.total)}</p>
            </div>
            <button onClick={() => window.print()} className="btn btn-secondary w-full">
              <Printer size={14} /> Imprimir Comprovante
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
