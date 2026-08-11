import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { OSForm } from './OSForm';
import { OSDetail } from './OSDetail';
import { ServiceOrder } from '../../types';

export const ServiceOrders: React.FC = () => {
  const [filter, setFilter] = useState<'Todas' | 'Abertas' | 'Em Execução' | 'Concluídas' | 'Canceladas'>('Todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOs, setEditingOs] = useState<ServiceOrder | undefined>(undefined);
  const [viewingOsId, setViewingOsId] = useState<number | null>(null);

  const serviceOrders = useLiveQuery(
    () => {
      let query = db.serviceOrders.orderBy('createdAt').reverse();
      if (filter === 'Abertas') {
        return db.serviceOrders.where('status').equals('aberta').reverse().toArray();
      } else if (filter === 'Em Execução') {
        return db.serviceOrders.where('status').equals('em_execucao').reverse().toArray();
      } else if (filter === 'Concluídas') {
        return db.serviceOrders.where('status').anyOf(['concluida', 'entregue']).reverse().toArray();
      } else if (filter === 'Canceladas') {
        return db.serviceOrders.where('status').equals('cancelada').reverse().toArray();
      }
      return query.toArray();
    },
    [filter]
  );

  const stats = useLiveQuery(async () => {
    const all = await db.serviceOrders.toArray();
    return {
      abertas: all.filter(os => os.status === 'aberta' || os.status === 'em_analise').length,
      emExecucao: all.filter(os => os.status === 'em_execucao').length,
      aguardandoPeca: all.filter(os => os.status === 'aguardando_peca').length,
      concluidas: all.filter(os => os.status === 'concluida' || os.status === 'entregue').length,
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

  const statusColors: Record<string, string> = {
    'aberta': 'bg-blue-100 text-blue-800',
    'em_analise': 'bg-yellow-100 text-yellow-800',
    'aguardando_aprovacao': 'bg-orange-100 text-orange-800',
    'aprovada': 'bg-green-100 text-green-800',
    'em_execucao': 'bg-purple-100 text-purple-800',
    'aguardando_peca': 'bg-red-100 text-red-800',
    'concluida': 'bg-teal-100 text-teal-800',
    'entregue': 'bg-gray-100 text-gray-800',
    'cancelada': 'bg-red-800 text-white'
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h1>
        <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          + Nova OS
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm">Abertas / Em Análise</h3>
          <p className="text-2xl font-bold">{stats?.abertas || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm">Em Execução</h3>
          <p className="text-2xl font-bold">{stats?.emExecucao || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm">Aguardando Peça</h3>
          <p className="text-2xl font-bold">{stats?.aguardandoPeca || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm">Concluídas / Entregues</h3>
          <p className="text-2xl font-bold">{stats?.concluidas || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {['Todas', 'Abertas', 'Em Execução', 'Concluídas', 'Canceladas'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 font-medium ${filter === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Abertura</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {serviceOrders?.map((os) => (
              <tr key={os.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{os.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{os.technicianName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{os.openingDate.toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[os.status] || 'bg-gray-100 text-gray-800'}`}>
                    {os.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {os.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setViewingOsId(os.id!)} className="text-blue-600 hover:text-blue-900 mr-3">Ver/Imprimir</button>
                  <button onClick={() => handleEdit(os)} className="text-yellow-600 hover:text-yellow-900 mr-3">Editar</button>
                  <button onClick={() => handleDelete(os.id!)} className="text-red-600 hover:text-red-900">Excluir</button>
                </td>
              </tr>
            ))}
            {serviceOrders?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhuma Ordem de Serviço encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
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
            const os = serviceOrders?.find(o => o.id === viewingOsId);
            if (os) handleEdit(os);
          }} 
        />
      )}
    </div>
  );
};
