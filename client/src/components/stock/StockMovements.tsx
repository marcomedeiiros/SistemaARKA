import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import {
  SectionTitle, StatCard, FormGroup, FormRow, Alert, formatCurrency
} from '../common/FormComponents';
import { reportService } from '../../services/reportService';
import { inventoryService } from '../../services/inventoryService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { StockMovementType } from '../../types';
import { Layers, AlertTriangle, TrendingDown, DollarSign, Download, Plus } from 'lucide-react';

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

const emptyForm = {
  productId: 0,
  type: 'entrada' as StockMovementType,
  quantity: 1,
  reason: ''
};

export const StockMovements: React.FC = () => {
  const movements = useLiveQuery(() => db.stockMovements.orderBy('createdAt').reverse().toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [filterType, setFilterType] = useState<string>('all');

  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === Number(form.productId));

  const openForm = () => {
    setForm({ ...emptyForm });
    setAlert(null);
    setSaving(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm({ ...emptyForm });
    setAlert(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!form.productId) {
      setAlert({ type: 'error', message: 'Selecione o produto.' });
      return;
    }
    if (form.type !== 'ajuste' && form.quantity <= 0) {
      setAlert({ type: 'error', message: 'Informe uma quantidade maior que zero.' });
      return;
    }
    if (!form.reason.trim()) {
      setAlert({ type: 'error', message: 'Informe o motivo da movimentação.' });
      return;
    }

    setSaving(true);
    try {
      await inventoryService.updateStock(
        Number(form.productId),
        form.type,
        Number(form.quantity),
        form.reason.trim(),
        currentUser?.name
      );
      showToast('Movimentação registrada.', 'success');
      closeForm();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao registrar a movimentação.'
      });
      setSaving(false);
    }
  };

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
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Controle de Estoque"
        subtitle="Movimentações, alertas e valor imobilizado"
        action={
          <button onClick={openForm} className="btn btn-primary">
            <Plus size={16} /> Nova Movimentação
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="kpi-grid">
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
          <div className="three-col-grid">
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

      {/* Nova movimentação manual */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title="Nova Movimentação de Estoque"
        description="Entradas de compra, saídas por perda e ajustes de inventário."
        maxWidth="md"
        footer={
          <>
            <button onClick={closeForm} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Registrando...' : 'Registrar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          <FormGroup label="Produto" required>
            <select
              className="arka-select"
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: Number(e.target.value) }))}
            >
              <option value={0}>- Selecione -</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
          </FormGroup>

          {selectedProduct && (
            <div className="p-3 rounded-xl text-center bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)]">Estoque atual</p>
              <p className="text-2xl font-bold text-arka-500 tabular">
                {selectedProduct.currentStock}{' '}
                <span className="text-sm font-medium">{selectedProduct.unit}</span>
              </p>
            </div>
          )}

          <FormGroup label="Tipo de movimentação">
            <div className="grid grid-cols-3 gap-2">
              {(['entrada', 'saida', 'ajuste'] as const).map((type) => {
                const active = form.type === type;
                const label = type === 'entrada' ? '↑ Entrada' : type === 'saida' ? '↓ Saída' : '⇄ Ajuste';
                const color = type === 'entrada' ? '#10b981' : type === 'saida' ? '#ef4444' : '#f59e0b';

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type }))}
                    aria-pressed={active}
                    className="py-2 rounded-lg text-sm font-medium border transition"
                    style={{
                      background: active ? `${color}1f` : 'transparent',
                      borderColor: active ? color : 'var(--border-color)',
                      color: active ? color : 'var(--text-muted)'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </FormGroup>

          <FormRow cols={2}>
            <FormGroup
              label={form.type === 'ajuste' ? 'Novo saldo total' : 'Quantidade'}
              required
              hint={form.type === 'ajuste' ? 'O saldo passa a ser exatamente este valor.' : undefined}
            >
              <input
                type="number"
                min="0"
                step="any"
                className="arka-input"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </FormGroup>
            <FormGroup label="Saldo resultante">
              <div className="arka-input flex items-center font-semibold">
                {selectedProduct
                  ? form.type === 'entrada'
                    ? selectedProduct.currentStock + Number(form.quantity || 0)
                    : form.type === 'saida'
                      ? selectedProduct.currentStock - Number(form.quantity || 0)
                      : Number(form.quantity || 0)
                  : '-'}
              </div>
            </FormGroup>
          </FormRow>

          <FormGroup label="Motivo / observação" required>
            <input
              className="arka-input"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Ex: Compra fornecedor NF-4521, perda/avaria, contagem de inventário..."
            />
          </FormGroup>
        </div>
      </Modal>
    </div>
  );
};
