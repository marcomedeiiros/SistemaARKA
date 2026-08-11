import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Product } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, FormGroup, FormRow, Alert, formatCurrency } from '../common/FormComponents';
import { ProductForm } from './ProductForm';
import { inventoryService } from '../../services/inventoryService';
import { Plus, Pencil, Trash2, Layers, AlertTriangle, Image } from 'lucide-react';

export const Products: React.FC = () => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [stockQty, setStockQty] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [stockAlert, setStockAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low'>('all');

  const filteredProducts = products.filter((p) => {
    if (filterStatus === 'active') return p.active;
    if (filterStatus === 'inactive') return !p.active;
    if (filterStatus === 'low') return p.active && p.currentStock <= p.minStock;
    return true;
  });

  const handleDelete = async (p: Product) => {
    if (window.confirm(`Excluir o produto "${p.name}"?`)) {
      await db.products.delete(p.id!);
    }
  };

  const handleStockSave = async () => {
    if (!stockProduct || stockQty <= 0 || !stockReason.trim()) {
      setStockAlert({ type: 'error', message: 'Preencha a quantidade e o motivo.' });
      return;
    }
    try {
      await inventoryService.updateStock(
        stockProduct.id!,
        stockType,
        stockQty,
        stockReason,
        'manual'
      );
      setStockAlert({ type: 'success', message: 'Movimentação registrada com sucesso!' });
      setTimeout(() => {
        setStockProduct(null);
        setStockAlert(null);
        setStockQty(1);
        setStockReason('');
      }, 1000);
    } catch (err: any) {
      setStockAlert({ type: 'error', message: err.message });
    }
  };

  const columns = [
    {
      header: 'Produto',
      key: 'name',
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[var(--border-color)] flex items-center justify-center flex-shrink-0">
              <Image size={16} className="text-[var(--text-muted)]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-main)] truncate max-w-[200px]">{p.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{p.sku} {p.brand && `· ${p.brand}`}</p>
          </div>
        </div>
      )
    },
    { header: 'Categoria', key: 'categoryName', render: (p: Product) => p.categoryName || '-' },
    { header: 'Unid.', key: 'unit' },
    {
      header: 'Custo',
      key: 'costPrice',
      render: (p: Product) => <span className="text-[var(--text-muted)]">{formatCurrency(p.costPrice)}</span>
    },
    {
      header: 'Venda',
      key: 'salePrice',
      render: (p: Product) => <span className="font-semibold text-green-400">{formatCurrency(p.salePrice)}</span>
    },
    {
      header: 'Estoque',
      key: 'currentStock',
      render: (p: Product) => {
        const isLow = p.currentStock <= p.minStock;
        return (
          <div className="flex items-center gap-1.5">
            {isLow && <AlertTriangle size={13} className="text-amber-400" />}
            <span className={`font-bold ${isLow ? 'text-amber-400' : 'text-green-400'}`}>
              {p.currentStock} {p.unit}
            </span>
            <span className="text-xs text-[var(--text-muted)]">(mín: {p.minStock})</span>
          </div>
        );
      }
    },
    {
      header: 'Status',
      key: 'active',
      render: (p: Product) => (
        <span className={`badge ${p.active ? 'badge-green' : 'badge-slate'}`}>
          {p.active ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 animate-fade-in">
      <SectionTitle
        title="Produtos"
        subtitle={`${products.length} produto(s) no catálogo`}
        action={
          <button onClick={() => { setEditProduct(undefined); setShowForm(true); }} className="btn btn-primary">
            <Plus size={16} /> Novo Produto
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'var(--border-color)' }}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'active', label: 'Ativos' },
          { key: 'inactive', label: 'Inativos' },
          { key: 'low', label: '⚠ Estoque Baixo' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key as any)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filterStatus === f.key ? 'var(--bg-card)' : 'transparent',
              color: filterStatus === f.key ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: filterStatus === f.key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={filteredProducts}
          searchPlaceholder="Buscar por nome, SKU ou código de barras..."
          searchFields={['name', 'sku', 'barcode', 'brand', 'categoryName']}
          emptyMessage="Nenhum produto encontrado para o filtro selecionado."
          actions={(p: Product) => (
            <>
              <button
                onClick={() => { setStockProduct(p); setStockAlert(null); }}
                className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/10 transition"
                title="Movimentar Estoque"
              >
                <Layers size={15} />
              </button>
              <button
                onClick={() => { setEditProduct(p); setShowForm(true); }}
                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"
                title="Editar"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                title="Excluir"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editProduct?.id ? 'Editar Produto' : 'Novo Produto'} maxWidth="2xl">
        <ProductForm product={editProduct} onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      </Modal>

      {/* Stock Movement Modal */}
      {stockProduct && (
        <Modal isOpen={!!stockProduct} onClose={() => { setStockProduct(null); setStockAlert(null); }} title={`Movimentação de Estoque - ${stockProduct.name}`} maxWidth="md">
          <div className="space-y-4">
            {stockAlert && <Alert type={stockAlert.type} message={stockAlert.message} onClose={() => setStockAlert(null)} />}

            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p className="text-sm text-[var(--text-muted)]">Estoque Atual</p>
              <p className="text-3xl font-bold text-blue-400">{stockProduct.currentStock} <span className="text-base">{stockProduct.unit}</span></p>
            </div>

            <FormGroup label="Tipo de Movimentação">
              <div className="flex gap-2">
                {(['entrada', 'saida', 'ajuste'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStockType(t)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition border"
                    style={{
                      background: stockType === t ? (t === 'entrada' ? 'rgba(16,185,129,0.15)' : t === 'saida' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)') : 'transparent',
                      borderColor: stockType === t ? (t === 'entrada' ? '#10b981' : t === 'saida' ? '#ef4444' : '#f59e0b') : 'var(--border-color)',
                      color: stockType === t ? (t === 'entrada' ? '#10b981' : t === 'saida' ? '#ef4444' : '#f59e0b') : 'var(--text-muted)'
                    }}
                  >
                    {t === 'entrada' ? '↑ Entrada' : t === 'saida' ? '↓ Saída' : '⇄ Ajuste'}
                  </button>
                ))}
              </div>
            </FormGroup>

            <FormGroup label={stockType === 'ajuste' ? 'Novo Estoque Total' : 'Quantidade'}>
              <input
                type="number"
                min="1"
                className="arka-input"
                value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))}
              />
            </FormGroup>

            <FormGroup label="Motivo / Observação" required>
              <input
                className="arka-input"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Ex: Compra fornecedor NF-4521, Perda/avaria..."
              />
            </FormGroup>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setStockProduct(null)} className="btn btn-secondary">Cancelar</button>
              <button type="button" onClick={handleStockSave} className="btn btn-primary">Registrar Movimentação</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
