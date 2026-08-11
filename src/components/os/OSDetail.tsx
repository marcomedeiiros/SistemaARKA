import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { osService } from '../../services/osService';
import { ServiceOrder, Customer, OSStatus, CompanySettings } from '../../types';

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
    if (os) {
      if ((newStatus === 'concluida' || newStatus === 'entregue') && os.status !== 'concluida' && os.status !== 'entregue') {
          const confirm = window.confirm('Atenção: Mudar para Concluída/Entregue irá deduzir estoque e gerar contas a receber se configurado. Deseja continuar?');
          if (!confirm) return;
      }
      await osService.updateServiceOrder(os.id!, { status: newStatus });
      setOs({ ...os, status: newStatus });
      alert('Status atualizado com sucesso!');
    }
  };

  if (!os) return <div>Carregando...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center overflow-y-auto p-4 z-50 print:bg-white print:p-0 print:overflow-visible">
      <div className="bg-white p-8 rounded-lg w-full max-w-4xl shadow-xl my-8 print:shadow-none print:m-0 print:w-full print:max-w-full">
        
        {/* Buttons - Hidden on Print */}
        <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
            <h2 className="text-2xl font-bold">Detalhes da OS {os.code}</h2>
            <div className="flex gap-2">
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as OSStatus)} className="border p-2 rounded">
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
                <button onClick={handleChangeStatus} className="px-4 py-2 bg-green-600 text-white rounded">Atualizar Status</button>
                <button onClick={onEdit} className="px-4 py-2 bg-yellow-500 text-white rounded">Editar</button>
                <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded">Imprimir</button>
                <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">Fechar</button>
            </div>
        </div>

        {/* Printable Area */}
        <div className="print-area">
            {/* Header */}
            <div className="flex justify-between border-b-2 border-gray-800 pb-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold uppercase">{company?.companyName || 'SISTEMA ARKA'}</h1>
                    <p>{company?.address} {company?.city} - {company?.state}</p>
                    <p>CNPJ: {company?.cnpj} | Tel: {company?.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold">ORDEM DE SERVIÇO</h2>
                    <p className="text-xl font-mono mt-2">Nº {os.code}</p>
                    <p className="inline-block mt-2 px-3 py-1 bg-gray-200 border rounded text-sm font-bold uppercase">{os.status}</p>
                </div>
            </div>

            {/* Customer Info */}
            <div className="border border-gray-400 p-4 mb-4 rounded">
                <h3 className="font-bold border-b border-gray-300 mb-2">DADOS DO CLIENTE</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Nome:</strong> {customer?.name}</p>
                    <p><strong>CPF/CNPJ:</strong> {customer?.document}</p>
                    <p><strong>Telefone:</strong> {customer?.phone}</p>
                    <p><strong>Email:</strong> {customer?.email}</p>
                    <p className="col-span-2"><strong>Endereço:</strong> {customer?.address}, {customer?.number} - {customer?.city}/{customer?.state}</p>
                </div>
            </div>

            {/* OS Info */}
            <div className="border border-gray-400 p-4 mb-4 rounded">
                 <h3 className="font-bold border-b border-gray-300 mb-2">DADOS DA ORDEM DE SERVIÇO</h3>
                 <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                    <p><strong>Técnico:</strong> {os.technicianName || 'Não atribuído'}</p>
                    <p><strong>Data Abertura:</strong> {os.openingDate.toLocaleDateString()}</p>
                    <p><strong>Data Conclusão:</strong> {os.completionDate?.toLocaleDateString() || 'N/A'}</p>
                 </div>
                 
                 <div className="mb-2">
                    <strong>Problema Relatado:</strong>
                    <p className="p-2 bg-gray-50 border rounded mt-1 min-h-[50px]">{os.problemDescription}</p>
                 </div>
                 {os.diagnosis && (
                    <div className="mb-2">
                        <strong>Diagnóstico:</strong>
                        <p className="p-2 bg-gray-50 border rounded mt-1">{os.diagnosis}</p>
                    </div>
                 )}
                 {os.executedSolution && (
                    <div className="mb-2">
                        <strong>Solução Executada:</strong>
                        <p className="p-2 bg-gray-50 border rounded mt-1">{os.executedSolution}</p>
                    </div>
                 )}
            </div>

            {/* Products & Services */}
            <div className="mb-4">
                {os.products && os.products.length > 0 && (
                    <div className="mb-4">
                        <h3 className="font-bold text-lg mb-2 border-b-2 border-gray-800">Produtos / Peças Utilizadas</h3>
                        <table className="w-full text-sm border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left">Descrição</th>
                                    <th className="border border-gray-300 p-2 text-center">Qtd</th>
                                    <th className="border border-gray-300 p-2 text-right">V. Unit</th>
                                    <th className="border border-gray-300 p-2 text-right">Desc.</th>
                                    <th className="border border-gray-300 p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {os.products.map((p, i) => (
                                    <tr key={i}>
                                        <td className="border border-gray-300 p-2">{p.name}</td>
                                        <td className="border border-gray-300 p-2 text-center">{p.quantity}</td>
                                        <td className="border border-gray-300 p-2 text-right">R$ {p.unitPrice.toFixed(2)}</td>
                                        <td className="border border-gray-300 p-2 text-right">R$ {p.discount?.toFixed(2) || '0.00'}</td>
                                        <td className="border border-gray-300 p-2 text-right">R$ {p.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {os.services && os.services.length > 0 && (
                    <div className="mb-4">
                        <h3 className="font-bold text-lg mb-2 border-b-2 border-gray-800">Serviços Executados</h3>
                        <table className="w-full text-sm border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left">Descrição</th>
                                    <th className="border border-gray-300 p-2 text-center">Qtd</th>
                                    <th className="border border-gray-300 p-2 text-right">V. Unit</th>
                                    <th className="border border-gray-300 p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {os.services.map((s, i) => (
                                    <tr key={i}>
                                        <td className="border border-gray-300 p-2">{s.name}</td>
                                        <td className="border border-gray-300 p-2 text-center">{s.quantity}</td>
                                        <td className="border border-gray-300 p-2 text-right">R$ {s.unitPrice.toFixed(2)}</td>
                                        <td className="border border-gray-300 p-2 text-right">R$ {s.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
                <div className="w-64 border border-gray-400 p-4 rounded bg-gray-50">
                    <div className="flex justify-between mb-1 text-sm"><span className="font-bold">Subtotal:</span> <span>R$ {os.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-sm"><span className="font-bold">Descontos:</span> <span>R$ {os.discount.toFixed(2)}</span></div>
                    <div className="flex justify-between mb-1 text-sm"><span className="font-bold">Acréscimos:</span> <span>R$ {os.surcharge.toFixed(2)}</span></div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-300 text-lg"><span className="font-bold">Total Geral:</span> <span className="font-bold">R$ {os.totalAmount.toFixed(2)}</span></div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
                <div>
                    <div className="border-t border-black pt-2 mx-8">
                        Assinatura do Cliente
                    </div>
                </div>
                <div>
                    <div className="border-t border-black pt-2 mx-8">
                        Assinatura do Técnico / Empresa
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="mt-8 text-xs text-gray-500 text-justify">
                <strong>Termos e Condições:</strong> Garantia de 90 dias para serviços executados e peças substituídas conforme CDC. Aparelhos não retirados em 90 dias após a conclusão poderão ser vendidos para custear as despesas, ou descartados adequadamente, isentando a empresa de responsabilidades.
            </div>
            
        </div>
      </div>
    </div>
  );
};
