import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Product } from '../../types';
import { FormGroup, FormRow, Alert } from '../common/FormComponents';
import { formatCurrency } from '../common/FormComponents';
import { TrendingUp } from 'lucide-react';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSave: () => void;
}

const UNITS = ['UN', 'PC', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'CX', 'MT', 'PT'];

const emptyForm = {
  sku: '', name: '', description: '', categoryId: 0, brand: '', unit: 'UN',
  costPrice: 0, salePrice: 0, currentStock: 0, minStock: 5,
  supplierId: undefined as number | undefined, barcode: '', imageUrl: '', active: true
};

export const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSave }) => {
  const [form, setForm] = useState(product ? { ...product } : { ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) || [];
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []) || [];

  const set = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const margin = form.costPrice > 0
    ? (((form.salePrice - form.costPrice) / form.costPrice) * 100).toFixed(1)
    : '0.0';

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.sku.trim()) errs.sku = 'SKU é obrigatório';
    if (form.salePrice <= 0) errs.salePrice = 'Preço de venda deve ser maior que zero';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const category = categories.find((c) => c.id === Number(form.categoryId));
      const supplier = suppliers.find((s) => s.id === Number(form.supplierId));
      const now = new Date().toISOString();
      const data: Product = {
        ...form,
        categoryId: Number(form.categoryId),
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        categoryName: category?.name,
        supplierName: supplier?.name,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        currentStock: Number(form.currentStock),
        minStock: Number(form.minStock),
        updatedAt: now,
        createdAt: product?.createdAt || now
      };
      if (product?.id) {
        await db.products.put({ ...data, id: product.id });
      } else {
        await db.products.add(data);
      }
      setAlert({ type: 'success', message: 'Produto salvo com sucesso!' });
      setTimeout(() => { onSave(); onClose(); }, 700);
    } catch (err: any) {
      setAlert({ type: 'error', message: `Erro: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <FormRow cols={3}>
        <FormGroup label="SKU / Código" required error={errors.sku}>
          <input className="arka-input" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="PRD-001" />
        </FormGroup>
        <div className="sm:col-span-2">
          <FormGroup label="Nome do Produto" required error={errors.name}>
            <input className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: SSD Kingston 1TB NVMe" />
          </FormGroup>
        </div>
      </FormRow>

      <FormGroup label="Descrição">
        <textarea className="arka-input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descrição detalhada do produto..." />
      </FormGroup>

      <FormRow cols={3}>
        <FormGroup label="Categoria">
          <select className="arka-select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value={0}>- Selecione -</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Marca">
          <input className="arka-input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Kingston, Samsung..." />
        </FormGroup>
        <FormGroup label="Unidade">
          <select className="arka-select" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormGroup>
      </FormRow>

      <div className="p-4 rounded-xl border border-[var(--border-color)] space-y-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Preços & Estoque</p>
        <FormRow cols={3}>
          <FormGroup label="Preço de Custo (R$)">
            <input type="number" step="0.01" min="0" className="arka-input" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
          </FormGroup>
          <FormGroup label="Preço de Venda (R$)" required error={errors.salePrice}>
            <input type="number" step="0.01" min="0" className="arka-input" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} />
          </FormGroup>
          <FormGroup label="Margem Estimada">
            <div className="arka-input flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)' }}>
              <TrendingUp size={14} className="text-green-400" />
              <span className="font-semibold text-green-400">{margin}%</span>
              <span className="text-xs text-[var(--text-muted)]">
                ({formatCurrency(form.salePrice - form.costPrice)} lucro)
              </span>
            </div>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label={product?.id ? 'Estoque Atual' : 'Estoque Inicial'}>
            <input type="number" min="0" className="arka-input" value={form.currentStock} onChange={(e) => set('currentStock', e.target.value)} />
          </FormGroup>
          <FormGroup label="Estoque Mínimo (Alerta)">
            <input type="number" min="0" className="arka-input" value={form.minStock} onChange={(e) => set('minStock', e.target.value)} />
          </FormGroup>
        </FormRow>
      </div>

      <FormRow cols={2}>
        <FormGroup label="Fornecedor">
          <select className="arka-select" value={form.supplierId || ''} onChange={(e) => set('supplierId', e.target.value || undefined)}>
            <option value="">- Nenhum -</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Código de Barras">
          <input className="arka-input" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="EAN-13" />
        </FormGroup>
      </FormRow>

      <FormGroup label="URL da Imagem">
        <input type="url" className="arka-input" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
      </FormGroup>

      <label className="flex items-center gap-3 cursor-pointer w-fit">
        <span className="switch">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
        </span>
        <span className="text-sm font-medium text-[var(--text-main)]">
          Produto ativo
          <span className="block text-xs font-normal text-[var(--text-muted)]">
            Produtos inativos não aparecem no PDV nem nas ordens de serviço.
          </span>
        </span>
      </label>

      <div className="modal-actions">
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvando...' : product?.id ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
};
