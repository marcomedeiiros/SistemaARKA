import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Customer } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle } from '../common/FormComponents';
import { CustomerForm } from './CustomerForm';
import { CustomerProfile } from './CustomerProfile';
import { useToast } from '../../context/ToastContext';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';

export const Customers: React.FC = () => {
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const handleDelete = async (c: Customer) => {
    if (!window.confirm(`Excluir o cliente "${c.name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      await db.customers.delete(c.id!);
      showToast(`Cliente "${c.name}" excluído.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir o cliente.', 'error');
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
                className="icon-btn icon-btn-blue"
                title="Ver perfil"
                aria-label={`Ver perfil de ${c.name}`}
              >
                <Eye size={15} />
              </button>
              <button
                onClick={() => { setEditCustomer(c); setShowForm(true); }}
                className="icon-btn icon-btn-amber"
                title="Editar"
                aria-label={`Editar ${c.name}`}
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(c)}
                className="icon-btn icon-btn-red"
                title="Excluir"
                aria-label={`Excluir ${c.name}`}
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
          isOpen
          onClose={() => setViewCustomer(null)}
          title="Perfil do Cliente"
          description="Histórico de ordens de serviço, vendas e financeiro."
          maxWidth="4xl"
        >
          <CustomerProfile customer={viewCustomer} />
        </Modal>
      )}
    </div>
  );
};
