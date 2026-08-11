import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { AccountReceivable, AccountPayable, PaymentMethod } from '../../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { SectionTitle, StatCard, FormGroup, FormRow, Alert, formatCurrency, formatDate, financialStatusColor, financialStatusLabel, paymentMethodLabel } from '../common/FormComponents';
import { financialService } from '../../services/financialService';
import { DollarSign, ArrowDownCircle, TrendingUp, AlertTriangle, Plus, CheckCircle, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type FinancialTab = 'receivable' | 'payable' | 'cashflow';

const PAYMENT_METHODS: PaymentMethod[] = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'transferencia', 'fiado'];
const PAYABLE_CATEGORIES = ['Fornecedor / Estoque', 'Aluguel', 'Energia / Utilidades', 'Salários', 'Impostos', 'Serviços Terceiros', 'Outros'];

export const Financial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinancialTab>('receivable');
  const receivables = useLiveQuery(() => db.accountsReceivable.orderBy('dueDate').toArray(), []) || [];
  const payables = useLiveQuery(() => db.accountsPayable.orderBy('dueDate').toArray(), []) || [];

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'receivable' | 'payable'; item: AccountReceivable | AccountPayable } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAlert, setPaymentAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showPayableForm, setShowPayableForm] = useState(false);
  const [payableForm, setPayableForm] = useState({
    supplierName: '', description: '', category: PAYABLE_CATEGORIES[0], amount: 0, dueDate: ''
  });
  const [payableAlert, setPayableAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Mark overdue
  const processedReceivables = receivables.map((r) => ({
    ...r,
    status: r.status === 'pendente' && r.dueDate < todayStr ? 'vencido' as const : r.status
  }));

  const processedPayables = payables.map((p) => ({
    ...p,
    status: p.status === 'pendente' && p.dueDate < todayStr ? 'vencido' as const : p.status
  }));

  const totalReceivable = processedReceivables.filter((r) => r.status !== 'pago' && r.status !== 'cancelado').reduce((s, r) => s + r.amount - (r.paidAmount || 0), 0);
  const totalPayable = processedPayables.filter((p) => p.status !== 'pago' && p.status !== 'cancelado').reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0);
  const overdueRec = processedReceivables.filter((r) => r.status === 'vencido').reduce((s, r) => s + r.amount - (r.paidAmount || 0), 0);
  const balance = totalReceivable - totalPayable;

  const openPayment = (type: 'receivable' | 'payable', item: any) => {
    const remaining = item.amount - (item.paidAmount || 0);
    setPaymentTarget({ type, item });
    setPaymentAmount(remaining);
    setPaymentAlert(null);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!paymentTarget || paymentAmount <= 0) return;
    try {
      if (paymentTarget.type === 'receivable') {
        await financialService.receivePayment(paymentTarget.item.id!, paymentAmount, paymentMethod, paymentDate);
      } else {
        await financialService.payAccount(paymentTarget.item.id!, paymentAmount, paymentMethod, paymentDate);
      }
      setPaymentAlert({ type: 'success', message: 'Pagamento registrado com sucesso!' });
      setTimeout(() => { setShowPaymentModal(false); setPaymentAlert(null); }, 800);
    } catch (err: any) {
      setPaymentAlert({ type: 'error', message: err.message });
    }
  };

  const handleAddPayable = async () => {
    if (!payableForm.supplierName || !payableForm.description || !payableForm.amount || !payableForm.dueDate) {
      setPayableAlert({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    try {
      const code = await financialService.generatePayableCode();
      await db.accountsPayable.add({
        code,
        supplierName: payableForm.supplierName,
        description: payableForm.description,
        category: payableForm.category,
        amount: Number(payableForm.amount),
        paidAmount: 0,
        dueDate: payableForm.dueDate,
        status: 'pendente',
        createdAt: new Date().toISOString()
      });
      setPayableAlert({ type: 'success', message: 'Conta a pagar registrada!' });
      setPayableForm({ supplierName: '', description: '', category: PAYABLE_CATEGORIES[0], amount: 0, dueDate: '' });
      setTimeout(() => { setShowPayableForm(false); setPayableAlert(null); }, 800);
    } catch (err: any) {
      setPayableAlert({ type: 'error', message: err.message });
    }
  };

  // Cash flow chart data (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthLabels = months.map((m) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
  });
  const inflow = months.map((m) =>
    receivables.filter((r) => r.createdAt.startsWith(m) && r.status === 'pago').reduce((s, r) => s + (r.paidAmount || 0), 0)
  );
  const outflow = months.map((m) =>
    payables.filter((p) => p.createdAt.startsWith(m) && p.status === 'pago').reduce((s, p) => s + (p.paidAmount || 0), 0)
  );

  const receivableColumns = [
    { header: 'Código', key: 'code', render: (r: any) => <span className="font-mono text-xs text-green-400">{r.code}</span> },
    { header: 'Cliente', key: 'customerName', render: (r: any) => <span className="font-medium">{r.customerName}</span> },
    { header: 'Descrição', key: 'description', render: (r: any) => <span className="text-sm truncate max-w-[200px]">{r.description}</span> },
    { header: 'Origem', key: 'originCode', render: (r: any) => <span className="text-xs text-[var(--text-muted)]">{r.originCode || 'Manual'}</span> },
    { header: 'Valor', key: 'amount', render: (r: any) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
    { header: 'Pago', key: 'paidAmount', render: (r: any) => <span className="text-green-400">{formatCurrency(r.paidAmount || 0)}</span> },
    { header: 'Vencimento', key: 'dueDate', render: (r: any) => formatDate(r.dueDate) },
    { header: 'Status', key: 'status', render: (r: any) => <span className={`badge ${financialStatusColor[r.status]}`}>{financialStatusLabel[r.status]}</span> }
  ];

  const payableColumns = [
    { header: 'Código', key: 'code', render: (p: any) => <span className="font-mono text-xs text-red-400">{p.code}</span> },
    { header: 'Fornecedor', key: 'supplierName', render: (p: any) => <span className="font-medium">{p.supplierName}</span> },
    { header: 'Descrição', key: 'description', render: (p: any) => <span className="text-sm">{p.description}</span> },
    { header: 'Categoria', key: 'category', render: (p: any) => <span className="text-xs text-[var(--text-muted)]">{p.category}</span> },
    { header: 'Valor', key: 'amount', render: (p: any) => <span className="font-semibold">{formatCurrency(p.amount)}</span> },
    { header: 'Pago', key: 'paidAmount', render: (p: any) => <span className="text-green-400">{formatCurrency(p.paidAmount || 0)}</span> },
    { header: 'Vencimento', key: 'dueDate', render: (p: any) => formatDate(p.dueDate) },
    { header: 'Status', key: 'status', render: (p: any) => <span className={`badge ${financialStatusColor[p.status]}`}>{financialStatusLabel[p.status]}</span> }
  ];

  const tabs = [
    { key: 'receivable' as FinancialTab, label: 'Contas a Receber' },
    { key: 'payable' as FinancialTab, label: 'Contas a Pagar' },
    { key: 'cashflow' as FinancialTab, label: 'Fluxo de Caixa' }
  ];

  return (
    <div className="p-6 animate-fade-in space-y-5">
      <SectionTitle title="Financeiro" subtitle="Contas a receber, pagar e fluxo de caixa" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="A Receber" value={formatCurrency(totalReceivable)} icon={<DollarSign size={20} />} color="green" />
        <StatCard title="A Pagar" value={formatCurrency(totalPayable)} icon={<ArrowDownCircle size={20} />} color="red" />
        <StatCard title="Saldo Previsto" value={formatCurrency(balance)} icon={<TrendingUp size={20} />} color={balance >= 0 ? 'blue' : 'red'} />
        <StatCard title="Vencido a Receber" value={formatCurrency(overdueRec)} icon={<AlertTriangle size={20} />} color={overdueRec > 0 ? 'amber' : 'green'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-color)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2.5 text-sm font-medium border-b-2 transition-all"
            style={{
              borderColor: activeTab === t.key ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Receivables Tab */}
      {activeTab === 'receivable' && (
        <div className="arka-card p-5">
          <DataTable
            columns={receivableColumns}
            data={processedReceivables}
            searchPlaceholder="Buscar por cliente, código ou origem..."
            searchFields={['customerName', 'code', 'originCode', 'description']}
            emptyMessage="Nenhuma conta a receber registrada."
            actions={(r: any) => r.status !== 'pago' && r.status !== 'cancelado' ? (
              <button
                onClick={() => openPayment('receivable', r)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-green-400 hover:bg-green-500/10 text-xs font-medium transition"
              >
                <CheckCircle size={13} /> Receber
              </button>
            ) : null}
          />
        </div>
      )}

      {/* Payables Tab */}
      {activeTab === 'payable' && (
        <div className="arka-card p-5">
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowPayableForm(true)} className="btn btn-primary text-sm">
              <Plus size={15} /> Nova Conta a Pagar
            </button>
          </div>
          <DataTable
            columns={payableColumns}
            data={processedPayables}
            searchPlaceholder="Buscar por fornecedor ou descrição..."
            searchFields={['supplierName', 'code', 'description', 'category']}
            emptyMessage="Nenhuma conta a pagar registrada."
            actions={(p: any) => p.status !== 'pago' && p.status !== 'cancelado' ? (
              <button
                onClick={() => openPayment('payable', p)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-green-400 hover:bg-green-500/10 text-xs font-medium transition"
              >
                <CheckCircle size={13} /> Pagar
              </button>
            ) : null}
          />
        </div>
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && (
        <div className="space-y-4">
          <div className="arka-card p-5">
            <h3 className="font-semibold text-[var(--text-main)] mb-4">Entradas × Saídas - Últimos 6 Meses</h3>
            <div style={{ height: 280 }}>
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: 'Entradas',
                      data: inflow,
                      backgroundColor: 'rgba(16,185,129,0.7)',
                      borderRadius: 5
                    },
                    {
                      label: 'Saídas',
                      data: outflow,
                      backgroundColor: 'rgba(239,68,68,0.7)',
                      borderRadius: 5
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' as const, labels: { boxWidth: 10 } },
                    tooltip: { callbacks: { label: (ctx: any) => formatCurrency(ctx.raw) } }
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: { ticks: { callback: (v: any) => `R$ ${(v / 1000).toFixed(0)}k` } }
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="arka-card p-5">
              <h3 className="font-semibold mb-3 text-[var(--text-main)]">Próximos Vencimentos - A Receber</h3>
              {processedReceivables.filter((r) => r.status === 'pendente').slice(0, 5).map((r) => (
                <div key={r.id} className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.customerName}</p>
                    <p className="text-xs text-[var(--text-muted)]">Vence: {formatDate(r.dueDate)}</p>
                  </div>
                  <span className="font-bold text-green-400">{formatCurrency(r.amount - (r.paidAmount || 0))}</span>
                </div>
              ))}
              {processedReceivables.filter((r) => r.status === 'pendente').length === 0 && (
                <p className="text-sm text-center text-[var(--text-muted)] py-4">Nenhuma conta pendente.</p>
              )}
            </div>

            <div className="arka-card p-5">
              <h3 className="font-semibold mb-3 text-[var(--text-main)]">Próximos Vencimentos - A Pagar</h3>
              {processedPayables.filter((p) => p.status === 'pendente').slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.supplierName}</p>
                    <p className="text-xs text-[var(--text-muted)]">Vence: {formatDate(p.dueDate)}</p>
                  </div>
                  <span className="font-bold text-red-400">{formatCurrency(p.amount - (p.paidAmount || 0))}</span>
                </div>
              ))}
              {processedPayables.filter((p) => p.status === 'pendente').length === 0 && (
                <p className="text-sm text-center text-[var(--text-muted)] py-4">Nenhuma conta pendente.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentTarget && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={paymentTarget.type === 'receivable' ? 'Registrar Recebimento' : 'Registrar Pagamento'}
          maxWidth="md"
        >
          <div className="space-y-4">
            {paymentAlert && <Alert type={paymentAlert.type} message={paymentAlert.message} onClose={() => setPaymentAlert(null)} />}
            <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)' }}>
              <p className="text-sm font-medium text-[var(--text-main)]">{paymentTarget.item.description}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Valor total: {formatCurrency(paymentTarget.item.amount)} · Pago: {formatCurrency((paymentTarget.item as any).paidAmount || 0)}
              </p>
            </div>
            <FormGroup label="Valor do Pagamento (R$)" required>
              <input type="number" min="0.01" step="0.01" className="arka-input" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </FormGroup>
            <FormGroup label="Forma de Pagamento">
              <select className="arka-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.filter((m) => m !== 'fiado').map((m) => (
                  <option key={m} value={m}>{paymentMethodLabel[m]}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Data do Pagamento">
              <input type="date" className="arka-input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </FormGroup>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handlePayment} className="btn btn-success">Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Payable Form Modal */}
      <Modal isOpen={showPayableForm} onClose={() => setShowPayableForm(false)} title="Nova Conta a Pagar" maxWidth="md">
        <div className="space-y-4">
          {payableAlert && <Alert type={payableAlert.type} message={payableAlert.message} onClose={() => setPayableAlert(null)} />}
          <FormGroup label="Fornecedor / Nome" required>
            <input className="arka-input" value={payableForm.supplierName} onChange={(e) => setPayableForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="Nome do fornecedor ou credor" />
          </FormGroup>
          <FormGroup label="Descrição" required>
            <input className="arka-input" value={payableForm.description} onChange={(e) => setPayableForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição da conta" />
          </FormGroup>
          <FormGroup label="Categoria">
            <select className="arka-select" value={payableForm.category} onChange={(e) => setPayableForm((f) => ({ ...f, category: e.target.value }))}>
              {PAYABLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormGroup>
          <FormRow>
            <FormGroup label="Valor (R$)" required>
              <input type="number" min="0" step="0.01" className="arka-input" value={payableForm.amount} onChange={(e) => setPayableForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </FormGroup>
            <FormGroup label="Vencimento" required>
              <input type="date" className="arka-input" value={payableForm.dueDate} onChange={(e) => setPayableForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </FormGroup>
          </FormRow>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowPayableForm(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleAddPayable} className="btn btn-primary">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
