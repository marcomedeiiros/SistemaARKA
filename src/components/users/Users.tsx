import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const openNew = () => { setEditUser(undefined); setForm({ ...empty }); setAlert(null); setShowForm(true); };
  const openEdit = (u: User) => { setEditUser(u); setForm({ name: u.name, email: u.email, role: u.role, active: u.active }); setAlert(null); setShowForm(true); };
  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setAlert({ type: 'error', message: 'Nome e e-mail são obrigatórios.' });
      return;
    }
    setLoading(true);
    try {
      if (editUser?.id) {
        await db.users.put({ ...editUser, ...form });
      } else {
        await db.users.add({ ...form, createdAt: new Date().toISOString() });
      }
      setAlert({ type: 'success', message: 'Usuário salvo com sucesso!' });
      setTimeout(() => { setShowForm(false); setAlert(null); }, 700);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (users.length <= 1) { alert('Não é possível excluir o único usuário do sistema.'); return; }
    if (window.confirm(`Excluir o usuário "${u.name}"?`)) await db.users.delete(u.id!);
  };

  const getRoleInfo = (role: UserRole) => ROLES.find((r) => r.value === role)!;

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
            <p className="font-medium text-[var(--text-main)]">{u.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Perfil de Acesso', key: 'role',
      render: (u: User) => {
        const role = getRoleInfo(u.role);
        return (
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: role.color }} />
            <span className="text-sm font-medium" style={{ color: role.color }}>{role.label}</span>
          </div>
        );
      }
    },
    {
      header: 'Permissões', key: 'role',
      render: (u: User) => <span className="text-xs text-[var(--text-muted)]">{getRoleInfo(u.role).description}</span>
    },
    {
      header: 'Status', key: 'active',
      render: (u: User) => <span className={`badge ${u.active ? 'badge-green' : 'badge-slate'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>
    }
  ];

  return (
    <div className="p-6 animate-fade-in space-y-5">
      <SectionTitle
        title="Usuários & Permissões"
        subtitle={`${users.length} usuário(s) no sistema`}
        action={
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} /> Novo Usuário
          </button>
        }
      />

      {/* Role Legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map((r) => (
          <div key={r.value} className="arka-card p-4" style={{ borderColor: `${r.color}30` }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} style={{ color: r.color }} />
              <span className="font-semibold text-sm" style={{ color: r.color }}>{r.label}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{r.description}</p>
            <p className="text-xs font-bold mt-2" style={{ color: r.color }}>
              {users.filter((u) => u.role === r.value).length} usuário(s)
            </p>
          </div>
        ))}
      </div>

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchFields={['name', 'email']}
          emptyMessage="Nenhum usuário cadastrado."
          actions={(u: User) => (
            <>
              <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"><Trash2 size={15} /></button>
            </>
          )}
        />
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser?.id ? 'Editar Usuário' : 'Novo Usuário'} maxWidth="lg">
        <div className="space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
          <FormRow>
            <FormGroup label="Nome Completo" required>
              <input className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </FormGroup>
            <FormGroup label="E-mail" required>
              <input type="email" className="arka-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </FormGroup>
          </FormRow>
          <FormGroup label="Perfil de Acesso">
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border"
                  style={{
                    borderColor: form.role === r.value ? r.color : 'var(--border-color)',
                    background: form.role === r.value ? `${r.color}15` : 'transparent'
                  }}
                >
                  <input
                    type="radio"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={() => set('role', r.value)}
                    className="hidden"
                  />
                  <Shield size={16} style={{ color: r.color }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </FormGroup>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
            <span className="text-sm">Usuário Ativo</span>
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
