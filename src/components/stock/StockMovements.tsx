import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { DataTable } from '../common/DataTable';
import { SectionTitle, StatCard, formatCurrency, formatDate } from '../common/FormComponents';
import { reportService } from '../../services/reportService';
import { Layers, AlertTriangle, TrendingDown, DollarSign, Download } from 'lucide-react';

const movTypeLabel: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  venda: 'Venda',
  os: 'Ordem de Serviço'
};

const movTypeColor: Record<string, string> = {
  entrada: 'badge-green',
  saida: 'badge-red',
  ajuste: 'badge-amber',
  venda: 'badge-purple',
  os: 'badge-blue'
};

export const StockMovements: React.FC = () => {
  const movements = useLiveQuery(() => db.stockMovements.orderBy('createdAt').reverse().toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [filterType, setFilterType] = useState<string>('all');

  const totalValue = products.reduce((s, p) => s + p.currentStock * p.costPrice, 0);
  const lowStock = products.filter((p) => p.active && p.currentStock <= p.minStock);
  const totalProducts = products.filter((p) => p.active).length;

  const filtered = filterType === 'all' ? movements : movements.filter((m) => m.type === filterType);

  const handleExport = () => {
    reportService.exportToExcel(
      filtered.map((m) => ({
        'Data/Hora': new Date(m.createdAt).toLocaleString('pt-BR'),
        'Produto': m.productName,
        'Tipo': movTypeLabel[m.type],
        'Quantidade': m.quantity,
        'Est. Anterior': m.previousStock,
        'Est. Novo': m.newStock,
        'Motivo': m.reason,
        'Usuário': m.userName || '-'
      })),
      'movimentacao_estoque.xlsx'
    );
  };

  const columns = [
    {
      header: 'Data/Hora',
      key: 'createdAt',
      render: (m: any) => (
        <span className="text-xs text-[var(--text-muted)]">
          {new Date(m.createdAt).toLocaleString('pt-BR')}
        </span>
      )
    },
    {
      header: 'Produto',
      key: 'productName',
      render: (m: any) => <span className="font-medium">{m.productName}</span>
    },
    {
      header: 'Tipo',
      key: 'type',
      render: (m: any) => (
        <span className={`badge ${movTypeColor[m.type]}`}>{movTypeLabel[m.type]}</span>
      )
    },
    {
      header: 'Qtd.',
      key: 'quantity',
      render: (m: any) => (
        <span className={`font-bold ${m.type === 'entrada' ? 'text-green-400' : m.type === 'ajuste' ? 'text-amber-400' : 'text-red-400'}`}>
          {m.type === 'entrada' ? '+' : m.type === 'ajuste' ? '→' : '-'}{m.quantity}
        </span>
      )
    },
    {
      header: 'Est. Anterior',
      key: 'previousStock',
      render: (m: any) => <span className="text-[var(--text-muted)]">{m.previousStock}</span>
    },
    {
      header: 'Est. Novo',
      key: 'newStock',
      render: (m: any) => <span className="font-semibold">{m.newStock}</span>
    },
    {
      header: 'Origem / Motivo',
      key: 'reason',
      render: (m: any) => <span className="text-sm">{m.reason}</span>
    }
  ];

  return (
    <div className="p-6 animate-fade-in space-y-5">
      <SectionTitle title="Controle de Estoque" subtitle="Movimentações e alertas de estoque" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Produtos Ativos" value={totalProducts} icon={<Layers size={20} />} color="blue" />
        <StatCard title="Estoque Crítico" value={`${lowStock.length} produto(s)`} icon={<AlertTriangle size={20} />} color={lowStock.length > 0 ? 'red' : 'green'} />
        <StatCard title="Movimentações" value={movements.length} icon={<TrendingDown size={20} />} color="purple" />
        <StatCard title="Valor em Estoque" value={formatCurrency(totalValue)} icon={<DollarSign size={20} />} color="green" />
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="arka-card p-5 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="font-semibold text-[var(--text-main)]">Produtos com Estoque Abaixo do Mínimo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--text-main)]">{p.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-400">{p.currentStock}</p>
                  <p className="text-xs text-[var(--text-muted)]">Mín: {p.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movements History */}
      <div className="arka-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-[var(--text-main)]">Histórico de Movimentações</h3>
          <div className="flex items-center gap-2">
            <select className="arka-select w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas Manuais</option>
              <option value="venda">Vendas</option>
              <option value="os">Ordens de Serviço</option>
              <option value="ajuste">Ajustes</option>
            </select>
            <button onClick={handleExport} className="btn btn-secondary text-sm">
              <Download size={14} /> Excel
            </button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Buscar por produto ou motivo..."
          searchFields={['productName', 'reason']}
          emptyMessage="Nenhuma movimentação registrada."
        />
      </div>
    </div>
  );
};
