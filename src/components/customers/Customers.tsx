import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Customer } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle } from '../common/FormComponents';
import { CustomerForm } from './CustomerForm';
import { CustomerProfile } from './CustomerProfile';
import { Plus, Eye, Pencil, Trash2, Users } from 'lucide-react';

export const Customers: React.FC = () => {
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const handleDelete = async (c: Customer) => {
    if (window.confirm(`Excluir o cliente "${c.name}"? Esta ação não pode ser desfeita.`)) {
      await db.customers.delete(c.id!);
    }
  };

  const columns = [
    {
      header: 'Nome / Razão Social',
      key: 'name' as keyof Customer,
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {c.name[0]}
          </div>
          <div>
            <p className="font-medium text-[var(--text-main)]">{c.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{c.document || '-'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Telefone',
      key: 'phone' as keyof Customer,
      render: (c: Customer) => c.phone || '-'
    },
    {
      header: 'E-mail',
      key: 'email' as keyof Customer,
      render: (c: Customer) => c.email || '-'
    },
    {
      header: 'Cidade / UF',
      key: 'city' as keyof Customer,
      render: (c: Customer) => c.city ? `${c.city}/${c.state}` : '-'
    }
  ];

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Clientes"
        subtitle={`${customers.length} cliente(s) cadastrado(s)`}
        action={
          <button
            onClick={() => { setEditCustomer(undefined); setShowForm(true); }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        }
      />

      <div className="arka-card p-5">
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Buscar por nome, CPF/CNPJ ou telefone..."
          searchFields={['name', 'document', 'phone', 'email']}
          emptyMessage="Nenhum cliente cadastrado. Clique em '+ Novo Cliente' para começar."
          actions={(c: Customer) => (
            <>
              <button
                onClick={() => setViewCustomer(c)}
                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition"
                title="Ver Perfil"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={() => { setEditCustomer(c); setShowForm(true); }}
                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"
                title="Editar"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(c)}
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
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editCustomer?.id ? 'Editar Cliente' : 'Novo Cliente'}
        maxWidth="2xl"
      >
        <CustomerForm
          customer={editCustomer}
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      </Modal>

      {/* Profile Modal */}
      {viewCustomer && (
        <Modal
          isOpen={!!viewCustomer}
          onClose={() => setViewCustomer(null)}
          title="Perfil do Cliente"
          maxWidth="4xl"
        >
          <CustomerProfile customer={viewCustomer} onClose={() => setViewCustomer(null)} />
        </Modal>
      )}
    </div>
  );
};
