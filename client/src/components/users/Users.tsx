import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { User, UserRole } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, FormGroup, FormRow, Alert } from '../common/FormComponents';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';

const ROLES: { value: UserRole; label: string; color: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', color: '#3b82f6', description: 'Acesso total ao sistema' },
  { value: 'seller', label: 'Vendedor', color: '#10b981', description: 'Acesso a vendas, clientes e produtos' },
  { value: 'technician', label: 'Técnico', color: '#f59e0b', description: 'Acesso a Ordens de Serviço e estoque' },
  { value: 'financial', label: 'Financeiro', color: '#a855f7', description: 'Acesso ao módulo financeiro' }
];

const empty = { name: '', email: '', role: 'seller' as UserRole, active: true };

export const Users: React.FC = () => {
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>();
  const [form, setForm] = useState({ ...empty });
  const [formBanner, setFormBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const openNew = () => { setEditUser(undefined); setForm({ ...empty }); setFormBanner(null); setShowForm(true); };
  const openEdit = (u: User) => { setEditUser(u); setForm({ name: u.name, email: u.email, role: u.role, active: u.active }); setFormBanner(null); setShowForm(true); };
  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormBanner({ type: 'error', message: 'Nome e e-mail são obrigatórios.' });
      return;
    }
    setLoading(true);
    try {
      if (editUser?.id) {
        await db.users.put({ ...editUser, ...form });
      } else {
        await db.users.add({ ...form, createdAt: new Date().toISOString() });
      }
      setFormBanner({ type: 'success', message: 'Usuário salvo com sucesso!' });
      setTimeout(() => { setShowForm(false); setFormBanner(null); }, 700);
    } catch (err: any) {
      setFormBanner({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (users.length <= 1) { window.alert('Não é possível excluir o único usuário do sistema.'); return; }
    if (window.confirm(`Excluir o usuário "${u.name}"?`)) await db.users.delete(u.id!);
  };

  const getRoleInfo = (role: UserRole) => ROLES.find((r) => r.value === role) || ROLES[1];

  const columns = [
    {
      header: 'Usuário', key: 'name',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: getRoleInfo(u.role).color }}>
              {u.name[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-[var(--text-main)]">{u.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Perfil', key: 'role',
      render: (u: User) => {
        const info = getRoleInfo(u.role);
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${info.color}15`, color: info.color }}>
            <Shield size={12} /> {info.label}
          </span>
        );
      }
    },
    {
      header: 'Status', key: 'active',
      render: (u: User) => (
        <span className={`badge ${u.active ? 'badge-green' : 'badge-slate'}`}>
          {u.active ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Usuários & Permissões"
        subtitle="Gerencie os usuários e perfis de acesso do sistema"
        action={
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} /> Novo Usuário
          </button>
        }
      />

      {/* Role Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r.value).length;
          return (
            <div key={r.value} className="arka-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: r.color }}>
                <Shield size={18} />
              </div>
              <div>
                <p className="font-bold text-[var(--text-main)]">{r.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{count} usuário(s)</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Buscar usuário por nome ou email..."
          searchFields={['name', 'email']}
          actions={(u: User) => (
            <>
              <button onClick={() => openEdit(u)} className="icon-btn icon-btn-amber" title="Editar" aria-label={`Editar ${u.name}`}>
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(u)} className="icon-btn icon-btn-red" title="Excluir" aria-label={`Excluir ${u.name}`}>
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editUser ? 'Editar Usuário' : 'Novo Usuário'}
        maxWidth="xl"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">
              {loading ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formBanner && <Alert type={formBanner.type} message={formBanner.message} />}

          <FormGroup label="Nome Completo *" required>
            <input type="text" className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: João da Silva" />
          </FormGroup>

          <FormGroup label="E-mail *" required>
            <input type="email" className="arka-input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="joao@empresa.com" />
          </FormGroup>

          <FormGroup label="Perfil de Acesso *" required>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className="p-3 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: form.role === r.value ? r.color : 'var(--border-color)',
                    background: form.role === r.value ? `${r.color}10` : 'transparent'
                  }}
                >
                  <p className="font-semibold text-xs" style={{ color: form.role === r.value ? r.color : 'var(--text-main)' }}>{r.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.description}</p>
                </button>
              ))}
            </div>
          </FormGroup>

          <FormRow cols={2}>
            <FormGroup label="Status">
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 rounded text-blue-500" />
                <span className="text-sm font-medium text-[var(--text-main)]">Usuário Ativo</span>
              </label>
            </FormGroup>
          </FormRow>

        </div>
      </Modal>
    </div>
  );
};
