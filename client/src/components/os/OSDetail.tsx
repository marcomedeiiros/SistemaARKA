import React, { useEffect, useState } from 'react';
import { Pencil, Printer, RefreshCw, X } from 'lucide-react';

import { db } from '../../db/db';
import { useLiveQuery } from '../../data/useLiveQuery';
import { osService } from '../../services/osService';
import { OSStatus } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { documentLogoProps } from '../../lib/brand';
import {
  formatCurrency,
  formatDate,
  osStatusLabel,
  LoadingSpinner
} from '../common/FormComponents';

interface OSDetailProps {
  osId: number;
  onClose: () => void;
  onEdit: () => void;
}

const STATUS_OPTIONS: OSStatus[] = ['aberta', 'em_execucao', 'encerrada', 'cancelada'];

const FINALIZED: OSStatus[] = ['encerrada'];

/**
 * Visualização e impressão de uma ordem de serviço.
 *
 * Antes montava o próprio overlay sem fechar no fundo nem no ESC. Agora usa o
 * componente Modal, e o documento fica marcado com `print-root` para que a
 * impressão saia limpa em A4.
 */
export const OSDetail: React.FC<OSDetailProps> = ({ osId, onClose, onEdit }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  // Vem do store: se o status mudar, a tela acompanha sozinha.
  const os = useLiveQuery(() => db.serviceOrders.get(osId), [osId]);
  const company = useLiveQuery(() => db.companySettings.toCollection().first(), []);
  const customer = useLiveQuery(
    () => (os?.customerId ? db.customers.get(os.customerId) : Promise.resolve(undefined)),
    [os?.customerId]
  );

  const [nextStatus, setNextStatus] = useState<OSStatus>('aberta');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (os?.status) setNextStatus(os.status);
  }, [os?.status]);

  const handleChangeStatus = async () => {
    if (!os?.id || nextStatus === os.status) return;

    const willFinalize = FINALIZED.includes(nextStatus) && !FINALIZED.includes(os.status);
    if (willFinalize) {
      const confirmed = window.confirm(
        'Encerrar esta OS vai dar baixa nas peças utilizadas no estoque e gerar a conta a receber. Deseja continuar?'
      );
      if (!confirmed) return;
    }

    setUpdating(true);
    try {
      await osService.changeStatus(os.id, nextStatus, currentUser?.name);
      showToast(`${os.code} agora está "${osStatusLabel[nextStatus]}".`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível atualizar o status.',
        'error'
      );
      setNextStatus(os.status);
    } finally {
      setUpdating(false);
    }
  };

  if (!os) {
    return (
      <Modal isOpen onClose={onClose} title="Ordem de Serviço">
        <LoadingSpinner label="Carregando detalhes da OS..." />
      </Modal>
    );
  }

  const subtotal = (os.productsTotal || 0) + (os.servicesTotal || 0);
  const statusChanged = nextStatus !== os.status;

  const address = [
    customer?.address || os.customerAddress,
    customer?.number,
    customer?.neighborhood,
    customer?.city && `${customer.city}/${customer.state}`
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Ordem de Serviço ${os.code}`}
      description="Visualização, mudança de status e impressão do documento."
      maxWidth="4xl"
      footer={
        <>
          <div className="flex items-center gap-2 mr-auto w-full sm:w-auto">
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as OSStatus)}
              className="arka-select text-sm"
              aria-label="Novo status da ordem de serviço"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {osStatusLabel[status]}
                </option>
              ))}
            </select>
            <button
              onClick={handleChangeStatus}
              disabled={!statusChanged || updating}
              className="btn btn-success shrink-0"
              title={statusChanged ? 'Aplicar novo status' : 'Selecione um status diferente'}
            >
              <RefreshCw size={14} /> {updating ? 'Salvando...' : 'Atualizar'}
            </button>
          </div>

          <button onClick={onEdit} className="btn btn-secondary">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={14} /> Imprimir
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            <X size={14} /> Fechar
          </button>
        </>
      }
    >
      <div className="print-root doc">
        {/* Cabeçalho da empresa */}
        <header className="doc-header">
          <div className="min-w-0">
            <img
              {...documentLogoProps(company?.logoUrl)}
              alt={company?.tradeName || company?.name || 'Arka Tecnologia'}
            />
            {company?.address && (
              <p className="doc-meta">
                {company.address}
                {company.city ? ` · ${company.city}/${company.state}` : ''}
              </p>
            )}
            <p className="doc-meta">
              CNPJ: {company?.cnpj || 'N/I'} · Tel: {company?.phone || 'N/I'}
            </p>
          </div>

          <div className="doc-header-right">
            <p className="doc-kind">Ordem de Serviço</p>
            <p className="doc-code">{os.code}</p>
            <span className="badge badge-slate w-fit">
              {osStatusLabel[os.status] || os.status}
            </span>
          </div>
        </header>

        {/* Cliente */}
        <section className="doc-section">
          <h3 className="doc-section-title">Dados do cliente</h3>
          <dl className="doc-facts">
            <div>
              <dt>Nome</dt>
              <dd>{customer?.name || os.customerName}</dd>
            </div>
            <div>
              <dt>CPF / CNPJ</dt>
              <dd>{customer?.document || os.customerDocument || 'N/I'}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{customer?.phone || os.customerPhone || 'N/I'}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{customer?.email || os.customerEmail || 'N/I'}</dd>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <dt>Endereço</dt>
              <dd>{address || 'N/I'}</dd>
            </div>
          </dl>
        </section>

        {/* Serviço */}
        <section className="doc-section">
          <h3 className="doc-section-title">Dados do serviço</h3>
          <dl className="doc-facts">
            <div>
              <dt>Técnico</dt>
              <dd>{os.technicianName || 'Não atribuído'}</dd>
            </div>
            <div>
              <dt>Abertura</dt>
              <dd>{formatDate(os.openingDate)}</dd>
            </div>
            <div>
              <dt>Conclusão</dt>
              <dd>{formatDate(os.completionDate)}</dd>
            </div>
          </dl>

          {/* Todos os blocos abaixo usam `whitespace-pre-line`: o técnico
              digita passos em linhas separadas e é assim que eles precisam ser
              lidos, no papel e na tela. Sem isso o texto virava um parágrafo
              corrido e dava a impressão de estar cortado. */}
          <div className="doc-field">
            <p className="doc-field-label">Problema relatado pelo cliente</p>
            <p className="doc-field-value whitespace-pre-line">
              {os.problemDescription?.trim() || 'Não informado.'}
            </p>
          </div>

          <div className="doc-field">
            <p className="doc-field-label">Serviço a executar</p>
            <p className="doc-field-value whitespace-pre-line">
              {os.requestedService?.trim() || 'Não informado.'}
            </p>
          </div>

          {os.diagnosis?.trim() && (
            <div className="doc-field">
              <p className="doc-field-label">Diagnóstico técnico</p>
              <p className="doc-field-value whitespace-pre-line">{os.diagnosis}</p>
            </div>
          )}

          {os.executedSolution?.trim() && (
            <div className="doc-field">
              <p className="doc-field-label">Solução executada</p>
              <p className="doc-field-value whitespace-pre-line">{os.executedSolution}</p>
            </div>
          )}
        </section>

        {/* Peças */}
        {os.products.length > 0 && (
          <div className="mt-4">
            <h3 className="doc-kind mb-1.5">Peças e produtos</h3>
            <div className="overflow-x-auto">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="text-center">Qtd.</th>
                    <th className="text-right">Unit.</th>
                    <th className="text-right">Desc.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {os.products.map((product, index) => (
                    <tr key={`${product.productId}-${index}`}>
                      <td>{product.productName}</td>
                      <td className="text-center">{product.quantity}</td>
                      <td className="text-right tabular">{formatCurrency(product.unitPrice)}</td>
                      <td className="text-right tabular">
                        {product.discount ? formatCurrency(product.discount) : '-'}
                      </td>
                      <td className="text-right font-semibold tabular">
                        {formatCurrency(product.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Serviços */}
        {os.services.length > 0 && (
          <div className="mt-4">
            <h3 className="doc-kind mb-1.5">Serviços executados</h3>
            <div className="overflow-x-auto">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="text-center">Qtd.</th>
                    <th className="text-right">Unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {os.services.map((service, index) => (
                    <tr key={`${service.name}-${index}`}>
                      <td>{service.name}</td>
                      <td className="text-center">{service.quantity}</td>
                      <td className="text-right tabular">{formatCurrency(service.unitPrice)}</td>
                      <td className="text-right font-semibold tabular">
                        {formatCurrency(service.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="doc-totals">
          <div>
            <span>Subtotal</span>
            <span className="tabular">{formatCurrency(subtotal)}</span>
          </div>
          {os.discount > 0 && (
            <div className="doc-totals-negative">
              <span>Descontos</span>
              <span className="tabular">-{formatCurrency(os.discount)}</span>
            </div>
          )}
          {os.surcharge > 0 && (
            <div>
              <span>Acréscimos</span>
              <span className="tabular">+{formatCurrency(os.surcharge)}</span>
            </div>
          )}
          <div className="doc-totals-grand">
            <span>Total geral</span>
            <span className="tabular">{formatCurrency(os.total)}</span>
          </div>
        </div>

        {os.notes?.trim() && (
          <p className="doc-notes whitespace-pre-line">
            <strong>Observações internas:</strong> {os.notes}
          </p>
        )}

        <div className="doc-signatures">
          <div>
            <div className="doc-signature-line">Assinatura do cliente</div>
          </div>
          <div>
            <div className="doc-signature-line">Assinatura do técnico / empresa</div>
          </div>
        </div>

        <p className="doc-terms">
          <strong>Termos e condições:</strong>{' '}
          {company?.termsAndConditions ||
            'Garantia de 90 dias para serviços executados e peças substituídas, conforme o CDC. Aparelhos não retirados em até 90 dias após a conclusão poderão ser descartados ou vendidos para custear as despesas do reparo.'}
        </p>
      </div>
    </Modal>
  );
};
