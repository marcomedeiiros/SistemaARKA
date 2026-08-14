import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { OSForm } from './OSForm';
import { OSDetail } from './OSDetail';
import { ServiceOrder } from '../../types';
import { formatDate, formatCurrency, osStatusLabel, osStatusColor, SectionTitle } from '../common/FormComponents';
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react';

export const ServiceOrders: React.FC = () => {
  const [filter, setFilter] = useState<'Todas' | 'Abertas' | 'Em Execução' | 'Concluídas' | 'Canceladas'>('Todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrder | undefined>(undefined);
  const [viewingOsId, setViewingOsId] = useState<number | null>(null);

  const serviceOrders = useLiveQuery(
    () => {
      if (filter === 'Abertas') {
        return db.serviceOrders.where('status').equals('aberta').reverse().toArray();
      } else if (filter === 'Em Execução') {
        return db.serviceOrders.where('status').equals('em_execucao').reverse().toArray();
      } else if (filter === 'Concluídas') {
        return db.serviceOrders.where('status').anyOf(['concluida', 'entregue']).reverse().toArray();
      } else if (filter === 'Canceladas') {
        return db.serviceOrders.where('status').equals('cancelada').reverse().toArray();
      }
      return db.serviceOrders.orderBy('createdAt').reverse().toArray();
    },
    [filter]
  );

  const stats = useLiveQuery(async () => {
    const all = await db.serviceOrders.toArray();
    return {
      abertas: all.filter((os) => os.status === 'aberta' || os.status === 'em_analise').length,
      emExecucao: all.filter((os) => os.status === 'em_execucao').length,
      aguardandoPeca: all.filter((os) => os.status === 'aguardando_peca').length,
      concluidas: all.filter((os) => os.status === 'concluida' || os.status === 'entregue').length,
    };
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) {
      await db.serviceOrders.delete(id);
    }
  };

  const handleEdit = (os: ServiceOrder) => {
    setEditingOs(os);
    setIsFormOpen(true);
    setViewingOsId(null);
  };

  const handleNew = () => {
    setEditingOs(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle
        title="Ordens de Serviço"
        subtitle="Gestão completa de OS e assistência técnica"
        action={
          <button onClick={handleNew} className="btn btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Nova OS</span><span className="sm:hidden">Nova</span>
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="arka-card p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Abertas / Em Análise</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">{stats?.abertas || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-purple-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Em Execução</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-400 mt-1">{stats?.emExecucao || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Aguardando Peça</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{stats?.aguardandoPeca || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Concluídas / Entregues</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{stats?.concluidas || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] overflow-x-auto gap-1">
        {['Todas', 'Abertas', 'Em Execução', 'Concluídas', 'Canceladas'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === tab
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Responsive Table */}
      <div className="arka-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="arka-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Técnico</th>
                <th>Abertura</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {serviceOrders?.map((os) => (
                <tr key={os.id}>
                  <td className="font-mono text-xs text-blue-400 font-bold">{os.code}</td>
                  <td className="font-medium text-xs sm:text-sm">{os.customerName}</td>
                  <td className="text-xs text-[var(--text-muted)]">{os.technicianName || '-'}</td>
                  <td className="text-xs">{formatDate(os.openingDate)}</td>
                  <td>
                    <span className={`badge ${osStatusColor[os.status] || 'badge-slate'}`}>
                      {osStatusLabel[os.status] || os.status}
                    </span>
                  </td>
                  <td className="text-right font-bold text-xs sm:text-sm text-emerald-400">
                    {formatCurrency(os.total)}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setViewingOsId(os.id!)} className="p-1.5 hover:bg-[var(--border-color)]/60 text-blue-400 rounded" title="Ver / Imprimir">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(os)} className="p-1.5 hover:bg-[var(--border-color)]/60 text-amber-400 rounded" title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(os.id!)} className="p-1.5 hover:bg-[var(--border-color)]/60 text-red-400 rounded" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {serviceOrders?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[var(--text-muted)]">
                    Nenhuma Ordem de Serviço encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <OSForm
          os={editingOs}
          onSave={() => setIsFormOpen(false)}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {viewingOsId && (
        <OSDetail
          osId={viewingOsId}
          onClose={() => setViewingOsId(null)}
          onEdit={() => {
            const os = serviceOrders?.find((o) => o.id === viewingOsId);
            if (os) handleEdit(os);
          }}
        />
      )}
    </div>
  );
};
