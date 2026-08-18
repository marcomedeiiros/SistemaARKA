import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { OSForm } from './OSForm';
import { OSDetail } from './OSDetail';
import { ServiceOrder } from '../../types';
import { formatDate, formatCurrency, osStatusLabel, osStatusColor, SectionTitle } from '../common/FormComponents';
import { useToast } from '../../context/ToastContext';
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react';

/** Texto completo usado no tooltip da coluna Descrição. */
function fullDescription(os: ServiceOrder): string {
  return os.requestedService?.trim() || os.problemDescription?.trim() || 'Sem descrição';
}

/**
 * Resumo de uma linha para a listagem: prioriza o serviço a executar e cai no
 * problema relatado quando ele não foi preenchido. As quebras de linha das
 * listas de passos viram separadores, para caber em uma única linha.
 */
function summarize(os: ServiceOrder): string {
  const text = os.requestedService?.trim() || os.problemDescription?.trim();
  if (!text) return '-';

  return text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s{2,}/g, ' ');
}

export const ServiceOrders: React.FC = () => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'Todas' | 'Abertas' | 'Em Execução' | 'Encerradas' | 'Canceladas'>('Todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrder | undefined>(undefined);
  const [viewingOsId, setViewingOsId] = useState<number | null>(null);

  const serviceOrders = useLiveQuery(
    () => {
      if (filter === 'Abertas') {
        return db.serviceOrders.where('status').equals('aberta').reverse().toArray();
      } else if (filter === 'Em Execução') {
        return db.serviceOrders.where('status').equals('em_execucao').reverse().toArray();
      } else if (filter === 'Encerradas') {
        return db.serviceOrders.where('status').equals('encerrada').reverse().toArray();
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
      abertas: all.filter((os) => os.status === 'aberta').length,
      emExecucao: all.filter((os) => os.status === 'em_execucao').length,
      encerradas: all.filter((os) => os.status === 'encerrada').length,
      canceladas: all.filter((os) => os.status === 'cancelada').length,
    };
  });

  const handleDelete = async (os: ServiceOrder) => {
    if (!window.confirm(`Excluir a ${os.code}? Esta ação não pode ser desfeita.`)) return;

    try {
      await db.serviceOrders.delete(os.id!);
      showToast(`${os.code} excluída.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir a OS.', 'error');
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
          <p className="text-xs text-[var(--text-muted)] font-medium">Abertas</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">{stats?.abertas || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-purple-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Em Execução</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-400 mt-1">{stats?.emExecucao || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Encerradas</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{stats?.encerradas || 0}</p>
        </div>
        <div className="arka-card p-4 border-l-4 border-l-red-500">
          <p className="text-xs text-[var(--text-muted)] font-medium">Canceladas</p>
          <p className="text-xl sm:text-2xl font-bold text-red-400 mt-1">{stats?.canceladas || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {(['Todas', 'Abertas', 'Em Execução', 'Encerradas', 'Canceladas'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={filter === tab}
            onClick={() => setFilter(tab)}
            className="tab-item"
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
                <th>Descrição</th>
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
                  <td>
                    {/* Resumo em até duas linhas, para caber bem mais texto que
                        o corte antigo de uma linha só. O texto integral fica no
                        title, e a OS completa no botão de visualizar. */}
                    <span
                      className="clamp-2 max-w-[340px] text-xs text-[var(--text-muted)]"
                      title={fullDescription(os)}
                    >
                      {summarize(os)}
                    </span>
                  </td>
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
                      <button
                        onClick={() => setViewingOsId(os.id!)}
                        className="icon-btn icon-btn-blue"
                        title="Ver / imprimir"
                        aria-label={`Ver ${os.code}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleEdit(os)}
                        className="icon-btn icon-btn-amber"
                        title="Editar"
                        aria-label={`Editar ${os.code}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(os)}
                        className="icon-btn icon-btn-red"
                        title="Excluir"
                        aria-label={`Excluir ${os.code}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {serviceOrders?.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">
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
