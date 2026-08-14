import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { SectionTitle, formatCurrency, formatDate, financialStatusColor, financialStatusLabel, osStatusLabel, osStatusColor, paymentMethodLabel } from '../common/FormComponents';
import { reportService } from '../../services/reportService';
import { BarChart3, Download, FileText } from 'lucide-react';

type ReportKey =
  | 'sales'
  | 'products_sold'
  | 'stock'
  | 'os'
  | 'receivable'
  | 'payable'
  | 'customers';

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: 'sales', label: 'Relatório de Vendas', description: 'Histórico completo de vendas por período' },
  { key: 'products_sold', label: 'Produtos Vendidos', description: 'Quais produtos foram mais vendidos e quantidade total' },
  { key: 'stock', label: 'Relatório de Estoque', description: 'Posição atual do estoque com valores e alertas' },
  { key: 'os', label: 'Ordens de Serviço', description: 'Histórico e status de todas as OS' },
  { key: 'receivable', label: 'Contas a Receber', description: 'Relatório financeiro de entradas e recebimentos' },
  { key: 'payable', label: 'Contas a Pagar', description: 'Relatório financeiro de despesas e pagamentos' },
  { key: 'customers', label: 'Clientes', description: 'Lista completa de clientes cadastrados' }
];

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportKey>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const sales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const serviceOrders = useLiveQuery(() => db.serviceOrders.orderBy('createdAt').reverse().toArray(), []) || [];
  const receivables = useLiveQuery(() => db.accountsReceivable.orderBy('dueDate').toArray(), []) || [];
  const payables = useLiveQuery(() => db.accountsPayable.orderBy('dueDate').toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];

  const filterByDate = <T extends { createdAt?: string; dueDate?: string }>(
    data: T[],
    dateKey: 'createdAt' | 'dueDate' = 'createdAt'
  ) => {
    return data.filter((item) => {
      const d = (item as any)[dateKey]?.split('T')[0] || '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  };

  const filteredSales = filterByDate(sales);
  const filteredOS = filterByDate(serviceOrders);
  const filteredRec = filterByDate(receivables, 'dueDate');
  const filteredPay = filterByDate(payables, 'dueDate');

  // Top selling products
  const productSales: Record<number, { name: string; sku: string; totalQty: number; totalRevenue: number }> = {};
  filteredSales.forEach((s) => {
    s.items.forEach((i) => {
      if (!productSales[i.productId]) {
        productSales[i.productId] = { name: i.productName, sku: i.sku, totalQty: 0, totalRevenue: 0 };
      }
      productSales[i.productId].totalQty += i.quantity;
      productSales[i.productId].totalRevenue += i.subtotal;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.totalQty - a.totalQty);

  const handleExcelExport = () => {
    let data: any[] = [];
    let filename = 'relatorio.xlsx';

    if (activeReport === 'sales') {
      data = filteredSales.map((s) => ({
        'Código': s.code,
        'Data': formatDate(s.createdAt),
        'Cliente': s.customerName,
        'Itens': s.items.length,
        'Subtotal': s.subtotal,
        'Desconto': s.discount,
        'Total': s.total,
        'Pagamento': paymentMethodLabel[s.paymentMethod],
        'Parcelas': s.installments,
        'Status': s.status
      }));
      filename = 'vendas.xlsx';
    } else if (activeReport === 'products_sold') {
      data = topProducts.map((p) => ({
        'Produto': p.name,
        'SKU': p.sku,
        'Qtd. Vendida': p.totalQty,
        'Receita Total': p.totalRevenue
      }));
      filename = 'produtos_vendidos.xlsx';
    } else if (activeReport === 'stock') {
      data = products.map((p) => ({
        'SKU': p.sku,
        'Nome': p.name,
        'Categoria': p.categoryName,
        'Estoque Atual': p.currentStock,
        'Estoque Mínimo': p.minStock,
        'Custo Unit.': p.costPrice,
        'Valor Total Estoque': p.currentStock * p.costPrice,
        'Status': p.active ? 'Ativo' : 'Inativo'
      }));
      filename = 'estoque.xlsx';
    } else if (activeReport === 'os') {
      data = filteredOS.map((o) => ({
        'Código': o.code,
        'Data Abertura': formatDate(o.openingDate),
        'Cliente': o.customerName,
        'Técnico': o.technicianName,
        'Status': osStatusLabel[o.status],
        'Problema': o.problemDescription,
        'Total': o.total
      }));
      filename = 'ordens_servico.xlsx';
    } else if (activeReport === 'receivable') {
      data = filteredRec.map((r) => ({
        'Código': r.code,
        'Cliente': r.customerName,
        'Descrição': r.description,
        'Valor': r.amount,
        'Pago': r.paidAmount,
        'Vencimento': formatDate(r.dueDate),
        'Status': financialStatusLabel[r.status]
      }));
      filename = 'contas_receber.xlsx';
    } else if (activeReport === 'payable') {
      data = filteredPay.map((p) => ({
        'Código': p.code,
        'Fornecedor': p.supplierName,
        'Descrição': p.description,
        'Categoria': p.category,
        'Valor': p.amount,
        'Pago': p.paidAmount,
        'Vencimento': formatDate(p.dueDate),
        'Status': financialStatusLabel[p.status]
      }));
      filename = 'contas_pagar.xlsx';
    } else if (activeReport === 'customers') {
      data = customers.map((c) => ({
        'Nome': c.name,
        'Documento': c.document,
        'Telefone': c.phone,
        'E-mail': c.email,
        'Cidade': c.city,
        'UF': c.state,
        'Cadastrado em': formatDate(c.createdAt)
      }));
      filename = 'clientes.xlsx';
    }

    reportService.exportToExcel(data, filename);
  };

  const handlePDFExport = () => {
    if (activeReport === 'sales') {
      reportService.exportToPDF(
        'Relatório de Vendas',
        [
          { header: 'Código', key: 'code' },
          { header: 'Data', key: 'createdAtFmt' },
          { header: 'Cliente', key: 'customerName' },
          { header: 'Total', key: 'totalFmt' },
          { header: 'Pagamento', key: 'paymentMethodFmt' }
        ],
        filteredSales.map((s) => ({
          ...s,
          createdAtFmt: formatDate(s.createdAt),
          totalFmt: formatCurrency(s.total),
          paymentMethodFmt: paymentMethodLabel[s.paymentMethod]
        })),
        'vendas.pdf'
      );
    } else if (activeReport === 'stock') {
      reportService.exportToPDF(
        'Relatório de Estoque',
        [
          { header: 'SKU', key: 'sku' },
          { header: 'Nome', key: 'name' },
          { header: 'Estoque', key: 'currentStock' },
          { header: 'Mínimo', key: 'minStock' },
          { header: 'Vlr. Unit.', key: 'salePriceFmt' }
        ],
        products.map((p) => ({ ...p, salePriceFmt: formatCurrency(p.salePrice) })),
        'estoque.pdf'
      );
    } else {
      alert('Exportação PDF disponível para Vendas e Estoque. Use Excel para os demais relatórios.');
    }
  };

  const renderTable = () => {
    if (activeReport === 'sales') {
      if (filteredSales.length === 0) return <p className="text-center py-10 text-[var(--text-muted)]">Nenhuma venda no período.</p>;
      return (
        <table className="arka-table">
          <thead><tr><th>Código</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Desconto</th><th>Total</th></tr></thead>
          <tbody>
            {filteredSales.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-purple-400">{s.code}</td>
                <td>{formatDate(s.createdAt)}</td>
                <td className="font-medium">{s.customerName}</td>
                <td>{s.items.length} prod.</td>
                <td>{paymentMethodLabel[s.paymentMethod]}</td>
                <td className="text-red-400">{s.discount > 0 ? formatCurrency(s.discount) : '-'}</td>
                <td className="font-bold text-green-400">{formatCurrency(s.total)}</td>
              </tr>
            ))}
            <tr className="font-bold text-[var(--text-main)] border-t-2 border-[var(--border-color)]">
              <td colSpan={6} className="text-right pr-4 text-sm">TOTAL PERÍODO:</td>
              <td className="text-green-400 text-lg">{formatCurrency(filteredSales.reduce((s, v) => s + v.total, 0))}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    if (activeReport === 'products_sold') {
      if (topProducts.length === 0) return <p className="text-center py-10 text-[var(--text-muted)]">Nenhuma venda no período.</p>;
      return (
        <table className="arka-table">
          <thead><tr><th>Rank</th><th>Produto</th><th>SKU</th><th>Qtd. Vendida</th><th>Receita Total</th></tr></thead>
          <tbody>
            {topProducts.map((p, idx) => (
              <tr key={p.sku}>
                <td>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-[var(--border-color)] text-[var(--text-muted)]'}`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="font-medium">{p.name}</td>
                <td className="font-mono text-xs text-[var(--text-muted)]">{p.sku}</td>
                <td className="font-bold text-blue-400">{p.totalQty}</td>
                <td className="font-bold text-green-400">{formatCurrency(p.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'stock') {
      return (
        <table className="arka-table">
          <thead><tr><th>SKU</th><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Custo Un.</th><th>Valor Total</th><th>Status</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.sku}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-xs">{p.categoryName || '-'}</td>
                <td className={`font-bold ${p.currentStock <= p.minStock ? 'text-amber-400' : 'text-green-400'}`}>{p.currentStock} {p.unit}</td>
                <td className="text-[var(--text-muted)]">{p.minStock}</td>
                <td>{formatCurrency(p.costPrice)}</td>
                <td className="font-semibold">{formatCurrency(p.currentStock * p.costPrice)}</td>
                <td><span className={`badge ${p.active ? 'badge-green' : 'badge-slate'}`}>{p.active ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'os') {
      if (filteredOS.length === 0) return <p className="text-center py-10 text-[var(--text-muted)]">Nenhuma OS no período.</p>;
      return (
        <table className="arka-table">
          <thead><tr><th>Código</th><th>Data</th><th>Cliente</th><th>Técnico</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {filteredOS.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs text-blue-400">{o.code}</td>
                <td>{formatDate(o.openingDate)}</td>
                <td className="font-medium">{o.customerName}</td>
                <td>{o.technicianName}</td>
                <td><span className={`badge ${osStatusColor[o.status]}`}>{osStatusLabel[o.status]}</span></td>
                <td className="font-bold">{formatCurrency(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'receivable') {
      if (filteredRec.length === 0) return <p className="text-center py-10 text-[var(--text-muted)]">Nenhuma conta a receber no período.</p>;
      return (
        <table className="arka-table">
          <thead><tr><th>Código</th><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Pago</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>
            {filteredRec.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-green-400">{r.code}</td>
                <td className="font-medium">{r.customerName}</td>
                <td className="text-sm">{r.description}</td>
                <td className="font-semibold">{formatCurrency(r.amount)}</td>
                <td className="text-green-400">{formatCurrency(r.paidAmount || 0)}</td>
                <td>{formatDate(r.dueDate)}</td>
                <td><span className={`badge ${financialStatusColor[r.status]}`}>{financialStatusLabel[r.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'payable') {
      if (filteredPay.length === 0) return <p className="text-center py-10 text-[var(--text-muted)]">Nenhuma conta a pagar no período.</p>;
      return (
        <table className="arka-table">
          <thead><tr><th>Código</th><th>Fornecedor</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>
            {filteredPay.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs text-red-400">{p.code}</td>
                <td className="font-medium">{p.supplierName}</td>
                <td className="text-sm">{p.description}</td>
                <td className="text-xs text-[var(--text-muted)]">{p.category}</td>
                <td className="font-semibold">{formatCurrency(p.amount)}</td>
                <td>{formatDate(p.dueDate)}</td>
                <td><span className={`badge ${financialStatusColor[p.status]}`}>{financialStatusLabel[p.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeReport === 'customers') {
      return (
        <table className="arka-table">
          <thead><tr><th>Nome</th><th>Documento</th><th>Telefone</th><th>E-mail</th><th>Cidade / UF</th><th>Cadastrado</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="font-mono text-xs">{c.document || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.city ? `${c.city}/${c.state}` : '-'}</td>
                <td>{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle title="Relatórios" subtitle="Exporte e analise dados do sistema" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Report Menu */}
        <div className="arka-card p-4 space-y-1 lg:col-span-1">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 px-2">Relatórios Disponíveis</p>
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveReport(r.key)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: activeReport === r.key ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: activeReport === r.key ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: activeReport === r.key ? 600 : 400,
                borderLeft: activeReport === r.key ? '3px solid #3b82f6' : '3px solid transparent'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="arka-card p-5 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-[var(--text-main)] text-lg">
                {REPORTS.find((r) => r.key === activeReport)?.label}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {REPORTS.find((r) => r.key === activeReport)?.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePDFExport} className="btn btn-secondary text-sm">
                <FileText size={14} /> PDF
              </button>
              <button onClick={handleExcelExport} className="btn btn-secondary text-sm">
                <Download size={14} /> Excel
              </button>
            </div>
          </div>

          {/* Date Filters */}
          {['sales', 'os', 'receivable', 'payable', 'products_sold'].includes(activeReport) && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">De:</label>
                <input type="date" className="arka-input w-auto text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">Até:</label>
                <input type="date" className="arka-input w-auto text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-[var(--text-muted)] hover:text-red-400 underline">
                  Limpar filtro
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto">{renderTable()}</div>
        </div>
      </div>
    </div>
  );
};
