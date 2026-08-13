import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { ServiceItemCatalog } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, FormGroup, FormRow, Alert, formatCurrency } from '../common/FormComponents';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const SERVICE_CATEGORIES = ['Software & SO', 'Manutenção', 'Diagnóstico', 'Redes', 'Instalação', 'Suporte', 'Outros'];

const empty: Omit<ServiceItemCatalog, 'id' | 'createdAt'> = {
  name: '', description: '', category: SERVICE_CATEGORIES[0], price: 0, estimatedDuration: '', active: true
};

export const Services: React.FC = () => {
  const services = useLiveQuery(() => db.services.orderBy('name').toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<ServiceItemCatalog | undefined>();
  const [form, setForm] = useState({ ...empty });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const openNew = () => { setEditService(undefined); setForm({ ...empty }); setAlert(null); setShowForm(true); };
  const openEdit = (s: ServiceItemCatalog) => { setEditService(s); setForm({ ...s }); setAlert(null); setShowForm(true); };
  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setAlert({ type: 'error', message: 'Nome é obrigatório.' }); return; }
    if (form.price <= 0) { setAlert({ type: 'error', message: 'Preço deve ser maior que zero.' }); return; }
    setLoading(true);
    try {
      if (editService?.id) {
        await db.services.put({ ...form, price: Number(form.price), id: editService.id, createdAt: editService.createdAt });
      } else {
        await db.services.add({ ...form, price: Number(form.price), createdAt: new Date().toISOString() });
      }
      setAlert({ type: 'success', message: 'Serviço salvo!' });
      setTimeout(() => { setShowForm(false); setAlert(null); }, 700);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (s: ServiceItemCatalog) => {
    if (window.confirm(`Excluir o serviço "${s.name}"?`)) await db.services.delete(s.id!);
  };

  const columns = [
    {
      header: 'Nome do Serviço', key: 'name',
      render: (s: ServiceItemCatalog) => (
        <div>
          <p className="font-medium text-[var(--text-main)]">{s.name}</p>
          {s.description && <p className="text-xs text-[var(--text-muted)] truncate max-w-[260px]">{s.description}</p>}
        </div>
      )
    },
    { header: 'Categoria', key: 'category', render: (s: ServiceItemCatalog) => <span className="badge badge-blue">{s.category}</span> },
    { header: 'Preço', key: 'price', render: (s: ServiceItemCatalog) => <span className="font-bold text-green-400">{formatCurrency(s.price)}</span> },
    { header: 'Duração Est.', key: 'estimatedDuration', render: (s: ServiceItemCatalog) => s.estimatedDuration || '-' },
    {
      header: 'Status', key: 'active',
      render: (s: ServiceItemCatalog) => <span className={`badge ${s.active ? 'badge-green' : 'badge-slate'}`}>{s.active ? 'Ativo' : 'Inativo'}</span>
    }
  ];

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Catálogo de Serviços"
        subtitle={`${services.length} serviço(s) cadastrado(s)`}
        action={
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} /> Novo Serviço
          </button>
        }
      />

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={services}
          searchPlaceholder="Buscar serviço por nome ou categoria..."
          searchFields={['name', 'category', 'description']}
          emptyMessage="Nenhum serviço cadastrado. Adicione serviços para inserir nas OS."
          actions={(s: ServiceItemCatalog) => (
            <>
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"><Trash2 size={15} /></button>
            </>
          )}
        />
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editService?.id ? 'Editar Serviço' : 'Novo Serviço'} maxWidth="lg">
        <div className="space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
          <FormGroup label="Nome do Serviço" required>
            <input className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Formatação e Instalação de SO" />
          </FormGroup>
          <FormGroup label="Descrição">
            <textarea className="arka-input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalhes do serviço..." />
          </FormGroup>
          <FormRow cols={3}>
            <FormGroup label="Categoria">
              <select className="arka-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Preço (R$)" required>
              <input type="number" min="0" step="0.01" className="arka-input" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </FormGroup>
            <FormGroup label="Duração Estimada">
              <input className="arka-input" value={form.estimatedDuration} onChange={(e) => set('estimatedDuration', e.target.value)} placeholder="Ex: 2h, 30min, 1 dia" />
            </FormGroup>
          </FormRow>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
            <span className="text-sm">Serviço Ativo</span>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
