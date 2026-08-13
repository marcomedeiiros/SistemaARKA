import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Supplier } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, FormGroup, FormRow, Alert } from '../common/FormComponents';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const empty: Omit<Supplier, 'id' | 'createdAt'> = {
  name: '', document: '', phone: '', whatsapp: '', email: '', address: '', notes: ''
};

export const Suppliers: React.FC = () => {
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | undefined>();
  const [form, setForm] = useState({ ...empty });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const openNew = () => { setEditSupplier(undefined); setForm({ ...empty }); setAlert(null); setShowForm(true); };
  const openEdit = (s: Supplier) => { setEditSupplier(s); setForm({ ...s }); setAlert(null); setShowForm(true); };
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setAlert({ type: 'error', message: 'Nome é obrigatório.' }); return; }
    setLoading(true);
    try {
      if (editSupplier?.id) {
        await db.suppliers.put({ ...form, id: editSupplier.id, createdAt: editSupplier.createdAt });
      } else {
        await db.suppliers.add({ ...form, createdAt: new Date().toISOString() });
      }
      setAlert({ type: 'success', message: 'Fornecedor salvo!' });
      setTimeout(() => { setShowForm(false); setAlert(null); }, 700);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (window.confirm(`Excluir o fornecedor "${s.name}"?`)) await db.suppliers.delete(s.id!);
  };

  const columns = [
    {
      header: 'Nome / Razão Social', key: 'name',
      render: (s: Supplier) => (
        <div>
          <p className="font-medium text-[var(--text-main)]">{s.name}</p>
          <p className="text-xs text-[var(--text-muted)]">{s.document || '-'}</p>
        </div>
      )
    },
    { header: 'Telefone', key: 'phone', render: (s: Supplier) => s.phone || '-' },
    { header: 'E-mail', key: 'email', render: (s: Supplier) => s.email || '-' },
    { header: 'Endereço', key: 'address', render: (s: Supplier) => <span className="text-sm">{s.address || '-'}</span> }
  ];

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Fornecedores"
        subtitle={`${suppliers.length} fornecedor(es) cadastrado(s)`}
        action={
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} /> Novo Fornecedor
          </button>
        }
      />

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={suppliers}
          searchPlaceholder="Buscar por nome, CNPJ ou telefone..."
          searchFields={['name', 'document', 'phone', 'email']}
          emptyMessage="Nenhum fornecedor cadastrado."
          actions={(s: Supplier) => (
            <>
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition" title="Editar"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition" title="Excluir"><Trash2 size={15} /></button>
            </>
          )}
        />
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editSupplier?.id ? 'Editar Fornecedor' : 'Novo Fornecedor'} maxWidth="xl">
        <div className="space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
          <FormRow>
            <FormGroup label="Nome / Razão Social" required>
              <input className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </FormGroup>
            <FormGroup label="CNPJ / CPF">
              <input className="arka-input" value={form.document} onChange={(e) => set('document', e.target.value)} />
            </FormGroup>
          </FormRow>
          <FormRow>
            <FormGroup label="Telefone">
              <input className="arka-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormGroup>
            <FormGroup label="WhatsApp">
              <input className="arka-input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
            </FormGroup>
          </FormRow>
          <FormGroup label="E-mail">
            <input type="email" className="arka-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </FormGroup>
          <FormGroup label="Endereço Completo">
            <input className="arka-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </FormGroup>
          <FormGroup label="Observações">
            <textarea className="arka-input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </FormGroup>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
