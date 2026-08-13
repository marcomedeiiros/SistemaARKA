import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { StatCard } from '../common/StatCard';
import { formatCurrency, formatDate, osStatusLabel, osStatusColor } from '../common/FormComponents';
import { DollarSign, ShoppingCart, ClipboardList, CheckCircle, TrendingUp, AlertTriangle, CreditCard, ArrowDownCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export const Dashboard: React.FC = () => {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const serviceOrders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const receivables = useLiveQuery(() => db.accountsReceivable.toArray(), []) || [];
  const payables = useLiveQuery(() => db.accountsPayable.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStr = startOfMonth.toISOString().split('T')[0];

  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
  const monthSales = sales.filter((s) => s.createdAt >= monthStr);
  const revenueToday = todaySales.reduce((sum, s) => sum + s.total, 0);
  const revenueMonth = monthSales.reduce((sum, s) => sum + s.total, 0);

  const openOS = serviceOrders.filter((o) =>
    !['concluida', 'cancelada', 'entregue'].includes(o.status)
  ).length;
  const completedOS = serviceOrders.filter((o) => o.status === 'concluida' || o.status === 'entregue').length;

  const totalReceivable = receivables
    .filter((r) => r.status === 'pendente' || r.status === 'vencido')
    .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

  const totalPayable = payables
    .filter((p) => p.status === 'pendente' || p.status === 'vencido')
    .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);

  const lowStockProducts = products.filter((p) => p.active && p.currentStock <= p.minStock);

  // Build last 7 days sales chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const salesByDay = last7.map((day) =>
    sales.filter((s) => s.createdAt.startsWith(day)).reduce((sum, s) => sum + s.total, 0)
  );
  const dayLabels = last7.map((d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
  );

  // Monthly revenue vs expenses
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthLabels = months.map((m) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
  });
  const revenueByMonth = months.map((m) =>
    receivables.filter((r) => r.createdAt.startsWith(m) && r.status === 'pago').reduce((s, r) => s + r.paidAmount, 0)
  );
  const expensesByMonth = months.map((m) =>
    payables.filter((p) => p.createdAt.startsWith(m) && p.status === 'pago').reduce((s, p) => s + p.paidAmount, 0)
  );

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => formatCurrency(ctx.raw)
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 11 }, callback: (v: any) => `R$ ${(v / 1000).toFixed(0)}k` }
      }
    }
  };

  const recentSales = [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentOS = [...serviceOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="page-container animate-fade-in">
      {/* KPI Cards Row 1 */}
      <div className="kpi-grid">
        <StatCard
          title="Faturamento do Dia"
          value={formatCurrency(revenueToday)}
          icon={<DollarSign size={20} />}
          color="green"
          trend={{ value: `${todaySales.length} venda(s)`, positive: true }}
        />
        <StatCard
          title="Faturamento do Mês"
          value={formatCurrency(revenueMonth)}
          icon={<TrendingUp size={20} />}
          color="blue"
          trend={{ value: `${monthSales.length} venda(s)`, positive: true }}
        />
        <StatCard
          title="OS Abertas"
          value={openOS}
          icon={<ClipboardList size={20} />}
          color="amber"
        />
        <StatCard
          title="OS Concluídas"
          value={completedOS}
          icon={<CheckCircle size={20} />}
          color="green"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="kpi-grid">
        <StatCard
          title="Total de Vendas"
          value={sales.length}
          icon={<ShoppingCart size={20} />}
          color="purple"
        />
        <StatCard
          title="Contas a Receber"
          value={formatCurrency(totalReceivable)}
          icon={<CreditCard size={20} />}
          color="blue"
        />
        <StatCard
          title="Contas a Pagar"
          value={formatCurrency(totalPayable)}
          icon={<ArrowDownCircle size={20} />}
          color="red"
        />
        <StatCard
          title="Estoque Crítico"
          value={`${lowStockProducts.length} produto(s)`}
          icon={<AlertTriangle size={20} />}
          color={lowStockProducts.length > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="two-col-grid">
        {/* Sales last 7 days */}
        <div className="arka-card p-5 chart-card">
          <h3 className="font-semibold text-[var(--text-main)] mb-1">Vendas - Últimos 7 Dias</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Faturamento diário acumulado</p>
          <div className="chart-card-body">
            <Bar
              data={{
                labels: dayLabels,
                datasets: [{
                  data: salesByDay,
                  backgroundColor: 'rgba(59,130,246,0.7)',
                  borderRadius: 6,
                  borderSkipped: false
                }]
              }}
              options={chartOptions as any}
            />
          </div>
        </div>

        {/* Revenue vs Expenses */}
        <div className="arka-card p-5 chart-card">
          <h3 className="font-semibold text-[var(--text-main)] mb-1">Receitas × Despesas (6 meses)</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Entradas e saídas financeiras</p>
          <div className="chart-card-body">
            <Line
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: 'Receitas',
                    data: revenueByMonth,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                  },
                  {
                    label: 'Despesas',
                    data: expensesByMonth,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#ef4444'
                  }
                ]
              }}
              options={{
                ...chartOptions as any,
                plugins: {
                  ...chartOptions.plugins,
                  legend: { display: true, labels: { color: textColor, boxWidth: 10, font: { size: 11 } } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="two-col-grid">
        {/* Recent Sales */}
        <div className="arka-card p-5">
          <h3 className="font-semibold text-[var(--text-main)] mb-4">Vendas Recentes</h3>
          {recentSales.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">Nenhuma venda registrada.</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--border-color)] last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{sale.code}</p>
                    <p className="text-xs text-[var(--text-muted)]">{sale.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(sale.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent OS */}
        <div className="arka-card p-5">
          <h3 className="font-semibold text-[var(--text-main)] mb-4">Ordens de Serviço Recentes</h3>
          {recentOS.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">Nenhuma OS registrada.</p>
          ) : (
            <div className="space-y-3">
              {recentOS.map((os) => (
                <div key={os.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--border-color)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-main)]">{os.code}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{os.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${osStatusColor[os.status]}`}>{osStatusLabel[os.status]}</span>
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(os.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="arka-card p-5 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="font-semibold text-[var(--text-main)]">Alerta: Produtos com Estoque Baixo</h3>
          </div>
          <div className="three-col-grid">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-main)] truncate">{p.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">SKU: {p.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-400">{p.currentStock} un</p>
                  <p className="text-xs text-[var(--text-muted)]">Mín: {p.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
