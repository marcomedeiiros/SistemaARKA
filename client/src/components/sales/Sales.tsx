import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Sale } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, StatCard, formatCurrency, formatDate, paymentMethodLabel } from '../common/FormComponents';
import { SalesForm } from './SalesForm';
import { SaleReceipt } from './SaleReceipt';
import { salesService } from '../../services/salesService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, ShoppingCart, TrendingUp, DollarSign, Calendar, Eye, Ban } from 'lucide-react';

export const Sales: React.FC = () => {
  const sales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), []) || [];
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
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

  /**
   * Cancela a venda preservando o histórico: o servidor marca o registro como
   * `cancelada`, devolve os itens ao estoque e cancela a conta a receber.
   */
  const handleCancel = async (s: Sale) => {
    if (s.status === 'cancelada') {
      showToast(`A ${s.code} já está cancelada.`, 'info');
      return;
    }

    const confirmed = window.confirm(
      `Cancelar a ${s.code}?\n\nOs produtos voltam para o estoque e a conta a receber vinculada é cancelada. A venda continua no histórico como "Cancelada".`
    );
    if (!confirmed) return;

    setCancelingId(s.id!);
    try {
      await salesService.cancelSale(s.id!, currentUser?.name);
      showToast(`${s.code} cancelada e estoque estornado.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cancelar a venda.', 'error');
    } finally {
      setCancelingId(null);
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
    <div className="page-container animate-fade-in">
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

      {/* Filtro de período */}
      <div className="segmented">
        {([
          { key: 'all', label: 'Todas' },
          { key: 'today', label: 'Hoje' },
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mês' }
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            aria-pressed={dateFilter === f.key}
            className="segmented-item"
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
                className="icon-btn icon-btn-blue"
                title="Ver comprovante"
                aria-label={`Ver comprovante da ${s.code}`}
              >
                <Eye size={15} />
              </button>
              <button
                onClick={() => handleCancel(s)}
                disabled={s.status === 'cancelada' || cancelingId === s.id}
                className="icon-btn icon-btn-red"
                title={s.status === 'cancelada' ? 'Venda já cancelada' : 'Cancelar venda'}
                aria-label={`Cancelar ${s.code}`}
              >
                <Ban size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* New Sale Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nova Venda / PDV" maxWidth="full">
        <SalesForm onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      </Modal>

      {/* Comprovante da venda */}
      {viewSale && <SaleReceipt sale={viewSale} onClose={() => setViewSale(null)} />}
    </div>
  );
};
