import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Product } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, FormGroup, Alert, formatCurrency } from '../common/FormComponents';
import { ProductForm } from './ProductForm';
import { inventoryService } from '../../services/inventoryService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ProductImport } from './ProductImport';
import { Plus, Pencil, Trash2, Layers, AlertTriangle, Image, Upload, KeyRound } from 'lucide-react';

export const Products: React.FC = () => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [stockQty, setStockQty] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockAlert, setStockAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'licenses' | 'active' | 'inactive' | 'low'
  >('all');

  const lowStockCount = products.filter((p) => p.active && p.currentStock <= p.minStock).length;
  const licenseCount = products.filter((p) => p.requiresLicenseKey).length;

  const filteredProducts = products.filter((p) => {
    if (filterStatus === 'licenses') return p.requiresLicenseKey;
    if (filterStatus === 'active') return p.active;
    if (filterStatus === 'inactive') return !p.active;
    if (filterStatus === 'low') return p.active && p.currentStock <= p.minStock;
    return true;
  });

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Excluir o produto "${p.name}"?`)) return;

    try {
      await db.products.delete(p.id!);
      showToast(`Produto "${p.name}" excluído.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir o produto.', 'error');
    }
  };

  /** Abre o modal de estoque já limpo, para não herdar valores da última abertura. */
  const openStockModal = (product: Product) => {
    setStockProduct(product);
    setStockType('entrada');
    setStockQty(1);
    setStockReason('');
    setStockAlert(null);
  };

  /** Fecha o modal de estoque descartando qualquer rascunho. */
  const closeStockModal = () => {
    setStockProduct(null);
    setStockType('entrada');
    setStockQty(1);
    setStockReason('');
    setStockAlert(null);
    setStockSaving(false);
  };

  const handleStockSave = async () => {
    if (!stockProduct) return;

    if (stockType !== 'ajuste' && stockQty <= 0) {
      setStockAlert({ type: 'error', message: 'Informe uma quantidade maior que zero.' });
      return;
    }
    if (stockQty < 0) {
      setStockAlert({ type: 'error', message: 'A quantidade não pode ser negativa.' });
      return;
    }
    if (!stockReason.trim()) {
      setStockAlert({ type: 'error', message: 'Informe o motivo da movimentação.' });
      return;
    }

    setStockSaving(true);
    try {
      await inventoryService.updateStock(
        stockProduct.id!,
        stockType,
        stockQty,
        stockReason.trim(),
        currentUser?.name
      );
      showToast(`Estoque de "${stockProduct.name}" atualizado.`, 'success');
      closeStockModal();
    } catch (err) {
      setStockAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao registrar a movimentação.'
      });
      setStockSaving(false);
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
            <p className="font-medium text-[var(--text-main)] truncate max-w-[200px] flex items-center gap-1.5">
              {p.name}
              {p.requiresLicenseKey && (
                <span className="badge badge-blue shrink-0 inline-flex items-center gap-1">
                  <KeyRound size={11} /> Licença
                </span>
              )}
            </p>
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
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Produtos"
        subtitle={`${products.length} produto(s) no catálogo`}
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImport(true)} className="btn btn-secondary">
              <Upload size={16} /> <span className="hidden sm:inline">Importar CSV</span><span className="sm:hidden">Importar</span>
            </button>
            <button onClick={() => { setEditProduct(undefined); setShowForm(true); }} className="btn btn-primary">
              <Plus size={16} /> <span className="hidden sm:inline">Novo Produto</span><span className="sm:hidden">Novo</span>
            </button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="segmented">
        {([
          { key: 'all', label: `Todos (${products.length})` },
          { key: 'licenses', label: `Licenças (${licenseCount})` },
          { key: 'active', label: 'Ativos' },
          { key: 'inactive', label: 'Inativos' },
          { key: 'low', label: `Estoque baixo (${lowStockCount})` }
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            aria-pressed={filterStatus === f.key}
            className="segmented-item"
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
                onClick={() => openStockModal(p)}
                className="icon-btn icon-btn-purple"
                title="Movimentar estoque"
                aria-label={`Movimentar estoque de ${p.name}`}
              >
                <Layers size={15} />
              </button>
              <button
                onClick={() => { setEditProduct(p); setShowForm(true); }}
                className="icon-btn icon-btn-amber"
                title="Editar"
                aria-label={`Editar ${p.name}`}
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="icon-btn icon-btn-red"
                title="Excluir"
                aria-label={`Excluir ${p.name}`}
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

      {/* CSV Import Modal */}
      {showImport && <ProductImport onClose={() => setShowImport(false)} />}

      {/* Stock Movement Modal */}
      {stockProduct && (
        <Modal isOpen onClose={closeStockModal} title={`Movimentação de Estoque - ${stockProduct.name}`} maxWidth="md">
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

            <div className="modal-actions">
              <button type="button" onClick={closeStockModal} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStockSave}
                disabled={stockSaving}
                className="btn btn-primary"
              >
                {stockSaving ? 'Registrando...' : 'Registrar Movimentação'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
