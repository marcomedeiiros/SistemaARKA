import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { osService } from '../../services/osService';
import { ServiceOrder, Customer, OSStatus, CompanySettings } from '../../types';
import { formatDate, formatCurrency, osStatusLabel } from '../common/FormComponents';

interface OSDetailProps {
  osId: number;
  onClose: () => void;
  onEdit: () => void;
}

export const OSDetail: React.FC<OSDetailProps> = ({ osId, onClose, onEdit }) => {
  const [os, setOs] = useState<ServiceOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [newStatus, setNewStatus] = useState<OSStatus>('aberta');

  useEffect(() => {
    const loadData = async () => {
      const loadedOs = await db.serviceOrders.get(osId);
      if (loadedOs) {
        setOs(loadedOs);
        setNewStatus(loadedOs.status);
        if (loadedOs.customerId) {
          const loadedCustomer = await db.customers.get(loadedOs.customerId);
          if (loadedCustomer) setCustomer(loadedCustomer);
        }
      }
      const loadedCompany = await db.companySettings.toCollection().first();
      if (loadedCompany) setCompany(loadedCompany);
    };
    loadData();
  }, [osId]);

  const handlePrint = () => {
    window.print();
  };

  const handleChangeStatus = async () => {
    if (os && os.id) {
      if ((newStatus === 'concluida' || newStatus === 'entregue') && os.status !== 'concluida' && os.status !== 'entregue') {
        const confirm = window.confirm('Atenção: Mudar para Concluída/Entregue irá deduzir estoque e gerar contas a receber se configurado. Deseja continuar?');
        if (!confirm) return;
      }
      await osService.updateServiceOrder(os.id, { status: newStatus });
      setOs({ ...os, status: newStatus });
      alert('Status atualizado com sucesso!');
    }
  };

  if (!os) return <div className="p-8 text-center">Carregando detalhes da OS...</div>;

  const subtotal = (os.productsTotal || 0) + (os.servicesTotal || 0);

  return (
    <div className="modal-overlay print:bg-white print:p-0 print:overflow-visible">
      <div className="modal-overlay-inner print:p-0">
      <div
        className="bg-[var(--bg-card)] text-[var(--text-main)] p-6 sm:p-8 rounded-xl w-full max-w-4xl shadow-2xl border border-[var(--border-color)] print:shadow-none print:m-0 print:w-full print:max-w-full print:border-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Buttons - Hidden on Print */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden border-b pb-4 border-[var(--border-color)]">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Ordem de Serviço {os.code}</h2>
            <p className="text-xs text-[var(--text-muted)]">Visualização e impressão de documento</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OSStatus)}
              className="arka-select w-auto text-sm"
            >
              <option value="aberta">Aberta</option>
              <option value="em_analise">Em Análise</option>
              <option value="aguardando_aprovacao">Aguardando Aprovação</option>
              <option value="aprovada">Aprovada</option>
              <option value="em_execucao">Em Execução</option>
              <option value="aguardando_peca">Aguardando Peça</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
              <option value="entregue">Entregue</option>
            </select>
            <button onClick={handleChangeStatus} className="btn btn-success text-xs py-2 px-3">Atualizar Status</button>
            <button onClick={onEdit} className="btn btn-secondary text-xs py-2 px-3">Editar</button>
            <button onClick={handlePrint} className="btn btn-primary text-xs py-2 px-3">Imprimir</button>
            <button onClick={onClose} className="btn btn-secondary text-xs py-2 px-3">Fechar</button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print-area text-slate-800 print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wide text-slate-900">{company?.tradeName || company?.name || 'SISTEMA ARKA'}</h1>
              <p className="text-xs sm:text-sm text-slate-600">{company?.address} {company?.city} - {company?.state}</p>
              <p className="text-xs sm:text-sm text-slate-600">CNPJ: {company?.cnpj || 'N/I'} | Tel: {company?.phone || 'N/I'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">ORDEM DE SERVIÇO</h2>
              <p className="text-lg font-mono font-bold text-blue-600 mt-1">{os.code}</p>
              <span className="inline-block mt-2 px-3 py-0.5 bg-slate-200 border border-slate-300 rounded text-xs font-bold uppercase text-slate-800">
                {osStatusLabel[os.status] || os.status}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border border-slate-300 p-4 mb-4 rounded-lg bg-slate-50/50">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 text-xs uppercase tracking-wider text-slate-700">DADOS DO CLIENTE</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <p><strong>Nome:</strong> {customer?.name || os.customerName}</p>
              <p><strong>CPF/CNPJ:</strong> {customer?.document || os.customerDocument || 'N/I'}</p>
              <p><strong>Telefone:</strong> {customer?.phone || os.customerPhone || 'N/I'}</p>
              <p><strong>Email:</strong> {customer?.email || os.customerEmail || 'N/I'}</p>
              <p className="col-span-1 sm:col-span-2"><strong>Endereço:</strong> {customer?.address || os.customerAddress || 'N/I'}, {customer?.number || ''} {customer?.city ? `- ${customer.city}/${customer.state}` : ''}</p>
            </div>
          </div>

          {/* OS Info */}
          <div className="border border-slate-300 p-4 mb-4 rounded-lg bg-slate-50/50">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 text-xs uppercase tracking-wider text-slate-700">DADOS DO SERVIÇO</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm mb-4">
              <p><strong>Técnico:</strong> {os.technicianName || 'Não atribuído'}</p>
              <p><strong>Data Abertura:</strong> {formatDate(os.openingDate)}</p>
              <p><strong>Data Conclusão:</strong> {formatDate(os.completionDate)}</p>
            </div>
            
            <div className="mb-2">
              <strong className="text-xs uppercase text-slate-700">Problema Relatado:</strong>
              <p className="p-2.5 bg-white border border-slate-200 rounded mt-1 min-h-[50px] text-xs sm:text-sm">{os.problemDescription}</p>
            </div>
            {os.diagnosis && (
              <div className="mb-2">
                <strong className="text-xs uppercase text-slate-700">Diagnóstico Técnico:</strong>
                <p className="p-2.5 bg-white border border-slate-200 rounded mt-1 text-xs sm:text-sm">{os.diagnosis}</p>
              </div>
            )}
            {os.executedSolution && (
              <div className="mb-2">
                <strong className="text-xs uppercase text-slate-700">Solução Executada:</strong>
                <p className="p-2.5 bg-white border border-slate-200 rounded mt-1 text-xs sm:text-sm">{os.executedSolution}</p>
              </div>
            )}
          </div>

          {/* Products & Services */}
          <div className="mb-4 space-y-4">
            {os.products && os.products.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 border-b-2 border-slate-800 uppercase tracking-wider text-slate-900">Peças e Produtos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase font-semibold">
                        <th className="border border-slate-300 p-2 text-left">Descrição</th>
                        <th className="border border-slate-300 p-2 text-center">Qtd</th>
                        <th className="border border-slate-300 p-2 text-right">V. Unit</th>
                        <th className="border border-slate-300 p-2 text-right">Desc.</th>
                        <th className="border border-slate-300 p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {os.products.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2">{p.productName}</td>
                          <td className="border border-slate-300 p-2 text-center">{p.quantity}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatCurrency(p.unitPrice)}</td>
                          <td className="border border-slate-300 p-2 text-right">{p.discount ? formatCurrency(p.discount) : '-'}</td>
                          <td className="border border-slate-300 p-2 text-right font-medium">{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {os.services && os.services.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 border-b-2 border-slate-800 uppercase tracking-wider text-slate-900">Serviços Executados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase font-semibold">
                        <th className="border border-slate-300 p-2 text-left">Descrição</th>
                        <th className="border border-slate-300 p-2 text-center">Qtd</th>
                        <th className="border border-slate-300 p-2 text-right">V. Unit</th>
                        <th className="border border-slate-300 p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {os.services.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2">{s.name}</td>
                          <td className="border border-slate-300 p-2 text-center">{s.quantity}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatCurrency(s.unitPrice)}</td>
                          <td className="border border-slate-300 p-2 text-right font-medium">{formatCurrency(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-64 border border-slate-300 p-4 rounded-lg bg-slate-50 text-xs sm:text-sm">
              <div className="flex justify-between mb-1"><span className="text-slate-600">Subtotal:</span> <span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between mb-1 text-red-600"><span className="text-slate-600">Descontos:</span> <span>- {formatCurrency(os.discount || 0)}</span></div>
              <div className="flex justify-between mb-1 text-blue-600"><span className="text-slate-600">Acréscimos:</span> <span>+ {formatCurrency(os.surcharge || 0)}</span></div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-300 text-base font-bold text-slate-900">
                <span>Total Geral:</span>
                <span className="text-emerald-700">{formatCurrency(os.total)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-800 pt-2 mx-4 font-semibold text-slate-700">
                Assinatura do Cliente
              </div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-2 mx-4 font-semibold text-slate-700">
                Assinatura do Técnico / Empresa
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-8 text-[11px] text-slate-500 text-justify leading-relaxed border-t border-slate-200 pt-3">
            <strong>Termos e Condições:</strong> {company?.termsAndConditions || 'Garantia de 90 dias para serviços executados e peças substituídas conforme CDC. Aparelhos não retirados em 90 dias após a conclusão poderão ser descartados ou vendidos para custear despesas.'}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
};
