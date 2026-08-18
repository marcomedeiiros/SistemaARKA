import React, { useState } from 'react';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { Customer } from '../../types';
import { formatCurrency, formatDate, osStatusLabel, osStatusColor, financialStatusColor, financialStatusLabel } from '../common/FormComponents';
import { ClipboardList, ShoppingCart, DollarSign, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface CustomerProfileProps {
  customer: Customer;
}

type Tab = 'os' | 'sales' | 'financial';

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer }) => {
  const [activeTab, setActiveTab] = useState<Tab>('os');

  const serviceOrders = useLiveQuery(
    () => db.serviceOrders.where('customerId').equals(customer.id!).reverse().sortBy('createdAt'),
    [customer.id]
  ) || [];

  const sales = useLiveQuery(
    () => db.sales.where('customerId').equals(customer.id!).reverse().sortBy('createdAt'),
    [customer.id]
  ) || [];

  const receivables = useLiveQuery(
    () => db.accountsReceivable.where('customerId').equals(customer.id!).reverse().sortBy('createdAt'),
    [customer.id]
  ) || [];

  const totalSpent = sales.reduce((s, v) => s + v.total, 0)
    + serviceOrders.filter((o) => o.status === 'encerrada').reduce((s, o) => s + o.total, 0);

  const openBalance = receivables
    .filter((r) => r.status === 'pendente' || r.status === 'vencido')
    .reduce((s, r) => s + (r.amount - (r.paidAmount || 0)), 0);

  const tabs = [
    { key: 'os' as Tab, label: 'Ordens de Serviço', icon: <ClipboardList size={15} />, count: serviceOrders.length },
    { key: 'sales' as Tab, label: 'Vendas', icon: <ShoppingCart size={15} />, count: sales.length },
    { key: 'financial' as Tab, label: 'Financeiro', icon: <DollarSign size={15} />, count: receivables.length }
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Identificação. O botão de fechar fica no cabeçalho do Modal antes
          havia um segundo X aqui, duplicando a ação. */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-arka-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
          {customer.name[0]}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)] truncate">{customer.name}</h2>
          <p className="text-sm text-[var(--text-muted)]">{customer.document || 'Sem documento cadastrado'}</p>
        </div>
      </div>

      {/* Contact Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-main)]">
            <Phone size={14} className="text-blue-400 flex-shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-main)]">
            <Mail size={14} className="text-blue-400 flex-shrink-0" />
            <span>{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-main)] sm:col-span-2">
            <MapPin size={14} className="text-blue-400 flex-shrink-0" />
            <span>{customer.address}, {customer.number} - {customer.neighborhood}, {customer.city}/{customer.state}</span>
          </div>
        )}
        {customer.notes && (
          <div className="flex items-start gap-2 text-sm text-[var(--text-muted)] sm:col-span-2">
            <FileText size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{customer.notes}</span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="arka-card p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Gasto</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="arka-card p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Saldo em Aberto</p>
          <p className="text-lg font-bold text-amber-400">{formatCurrency(openBalance)}</p>
        </div>
        <div className="arka-card p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Cadastrado em</p>
          <p className="text-base font-bold text-[var(--text-main)]">{formatDate(customer.createdAt)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className="tab-item"
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="badge badge-slate">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="overflow-x-auto">
        {activeTab === 'os' && (
          serviceOrders.length === 0 ? (
            <p className="text-center py-8 text-[var(--text-muted)]">Nenhuma OS encontrada para este cliente.</p>
          ) : (
            <table className="arka-table">
              <thead>
                <tr>
                  <th>Código</th><th>Data</th><th>Problema</th><th>Status</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {serviceOrders.map((os) => (
                  <tr key={os.id}>
                    <td className="font-mono text-xs text-blue-400">{os.code}</td>
                    <td>{formatDate(os.openingDate)}</td>
                    <td className="max-w-[200px] truncate text-sm">{os.problemDescription}</td>
                    <td><span className={`badge ${osStatusColor[os.status]}`}>{osStatusLabel[os.status]}</span></td>
                    <td className="font-semibold">{formatCurrency(os.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'sales' && (
          sales.length === 0 ? (
            <p className="text-center py-8 text-[var(--text-muted)]">Nenhuma venda encontrada para este cliente.</p>
          ) : (
            <table className="arka-table">
              <thead>
                <tr>
                  <th>Código</th><th>Data</th><th>Itens</th><th>Forma Pagto.</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs text-purple-400">{s.code}</td>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>{s.items.length} produto(s)</td>
                    <td>{s.paymentMethod}</td>
                    <td className="font-semibold text-green-400">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'financial' && (
          receivables.length === 0 ? (
            <p className="text-center py-8 text-[var(--text-muted)]">Nenhum lançamento financeiro encontrado.</p>
          ) : (
            <table className="arka-table">
              <thead>
                <tr>
                  <th>Código</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-green-400">{r.code}</td>
                    <td className="text-sm max-w-[200px] truncate">{r.description}</td>
                    <td>{formatDate(r.dueDate)}</td>
                    <td className="font-semibold">{formatCurrency(r.amount)}</td>
                    <td>{formatCurrency(r.paidAmount || 0)}</td>
                    <td><span className={`badge ${financialStatusColor[r.status]}`}>{financialStatusLabel[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};
