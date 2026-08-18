import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { osService } from '../../services/osService';
import { ServiceOrder, Customer, Product, ServiceItemCatalog, OSProduct, OSService, OSStatus } from '../../types';
import { Alert, FormRow, formatCurrency } from '../common/FormComponents';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface OSFormProps {
  os?: ServiceOrder;
  onSave: () => void;
  onClose: () => void;
}

export const OSForm: React.FC<OSFormProps> = ({ os, onSave, onClose }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [customerId, setCustomerId] = useState<number | ''>(os?.customerId || '');
  const [customerName, setCustomerName] = useState(os?.customerName || '');
  const [technicianName, setTechnicianName] = useState(os?.technicianName || '');
  const [openingDate, setOpeningDate] = useState<string>(
    os?.openingDate ? os.openingDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<OSStatus>(os?.status || 'aberta');
  const [problemDescription, setProblemDescription] = useState(os?.problemDescription || '');
  const [requestedService, setRequestedService] = useState(os?.requestedService || '');
  const [diagnosis, setDiagnosis] = useState(os?.diagnosis || '');
  const [executedSolution, setExecutedSolution] = useState(os?.executedSolution || '');
  const [notes, setNotes] = useState(os?.notes || '');
  
  const [products, setProducts] = useState<OSProduct[]>(os?.products || []);
  const [services, setServices] = useState<OSService[]>(os?.services || []);
  
  const [globalDiscount, setGlobalDiscount] = useState(os?.discount || 0);
  const [surcharge, setSurcharge] = useState(os?.surcharge || 0);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [availableServices, setAvailableServices] = useState<ServiceItemCatalog[]>([]);

  // As buscas procuram o termo em qualquer posição do texto (não só no início),
  // o que encontra "Alfa" em "Grupo Comercial Alfa LTDA".
  useEffect(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) {
      setCustomers([]);
      return;
    }

    let active = true;
    db.customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.phone ?? '').toLowerCase().includes(term) ||
          (c.document ?? '').toLowerCase().includes(term)
      )
      .limit(6)
      .toArray()
      .then((rows) => {
        if (active) setCustomers(rows);
      })
      .catch(() => {
        if (active) setCustomers([]);
      });

    return () => {
      active = false;
    };
  }, [customerSearch]);

  useEffect(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) {
      setAvailableProducts([]);
      return;
    }

    let active = true;
    db.products
      .filter(
        (p) =>
          p.active &&
          (p.name.toLowerCase().includes(term) ||
            (p.sku ?? '').toLowerCase().includes(term) ||
            (p.barcode ?? '').toLowerCase().includes(term))
      )
      .limit(6)
      .toArray()
      .then((rows) => {
        if (active) setAvailableProducts(rows);
      })
      .catch(() => {
        if (active) setAvailableProducts([]);
      });

    return () => {
      active = false;
    };
  }, [productSearch]);

  useEffect(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) {
      setAvailableServices([]);
      return;
    }

    let active = true;
    db.services
      .filter(
        (s) =>
          s.active &&
          (s.name.toLowerCase().includes(term) ||
            (s.category ?? '').toLowerCase().includes(term))
      )
      .limit(6)
      .toArray()
      .then((rows) => {
        if (active) setAvailableServices(rows);
      })
      .catch(() => {
        if (active) setAvailableServices([]);
      });

    return () => {
      active = false;
    };
  }, [serviceSearch]);

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id!);
    setCustomerName(c.name);
    setCustomerSearch('');
    setCustomers([]);
  };

  const addProduct = (product: Product) => {
    const unitPrice = product.salePrice || 0;
    setProducts([...products, {
      productId: product.id!,
      productName: product.name,
      sku: product.sku || '',
      quantity: 1,
      unitPrice,
      discount: 0,
      total: unitPrice
    }]);
    setProductSearch('');
    setAvailableProducts([]);
  };

  const addService = (service: ServiceItemCatalog | string) => {
    if (typeof service === 'string') {
      setServices([...services, {
        name: service,
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]);
    } else {
      const price = service.price || 0;
      setServices([...services, {
        serviceId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: price,
        total: price
      }]);
    }
    setServiceSearch('');
    setAvailableServices([]);
  };

  const updateProduct = (index: number, field: keyof OSProduct, value: number) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    const p = newProducts[index];
    p.total = (p.quantity * p.unitPrice) - (p.discount || 0);
    setProducts(newProducts);
  };

  const updateService = (index: number, field: keyof OSService, value: number) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    const s = newServices[index];
    s.total = s.quantity * s.unitPrice;
    setServices(newServices);
  };

  const productsTotal = products.reduce((acc, p) => acc + p.total, 0);
  const servicesTotal = services.reduce((acc, s) => acc + s.total, 0);
  const subtotal = productsTotal + servicesTotal;
  const grandTotal = subtotal - globalDiscount + surcharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      setAlert({ type: 'error', message: 'Selecione o cliente da ordem de serviço.' });
      return;
    }
    if (!openingDate) {
      setAlert({ type: 'error', message: 'Informe a data de abertura.' });
      return;
    }
    if (!problemDescription.trim()) {
      setAlert({ type: 'error', message: 'Descreva o problema relatado pelo cliente.' });
      return;
    }

    setAlert(null);
    setSaving(true);

    const osData: Omit<ServiceOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'> = {
      customerId: Number(customerId),
      customerName: customerName || 'Cliente',
      technicianName: technicianName || 'Técnico Responsável',
      openingDate,
      status,
      problemDescription,
      requestedService,
      diagnosis,
      executedSolution,
      notes,
      products,
      services,
      productsTotal,
      servicesTotal,
      discount: globalDiscount,
      surcharge,
      total: grandTotal,
    };

    try {
      if (os?.id) {
        await osService.updateServiceOrder(os.id, osData, currentUser?.name);
      } else {
        await osService.createServiceOrder(osData, currentUser?.name);
      }
      showToast(
        os?.id ? `${os.code} atualizada com sucesso.` : 'Ordem de serviço criada com sucesso.',
        'success'
      );
      onSave();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao salvar a ordem de serviço.'
      });
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: { value: OSStatus; label: string }[] = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'em_execucao', label: 'Em Execução' },
    { value: 'encerrada', label: 'Encerrada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={os ? `Editar ${os.code}` : 'Nova Ordem de Serviço'}
      description={
        os
          ? 'Alterar para Encerrada dá baixa nas peças e gera a conta a receber.'
          : 'Registre o equipamento, o problema relatado e os itens utilizados.'
      }
      maxWidth="4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" form="os-form" disabled={saving} className="btn btn-primary">
            {saving ? 'Salvando...' : 'Salvar Ordem de Serviço'}
          </button>
        </>
      }
    >
      <form id="os-form" onSubmit={handleSubmit} className="space-y-4">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
          
          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cliente *</label>
              {!customerId ? (
                <div>
                  <input
                    type="text"
                    placeholder="Buscar por nome, telefone ou documento..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="arka-input"
                  />
                  {customers.length > 0 && (
                    <div className="autocomplete-results">
                      {customers.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="autocomplete-item"
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-xs text-[var(--text-muted)] shrink-0">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch.trim() && customers.length === 0 && (
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      Nenhum cliente encontrado para "{customerSearch}".
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="arka-input flex-1 flex items-center justify-between font-semibold text-blue-400">
                    <span>{customerName || `Cliente #${customerId}`}</span>
                  </div>
                  <button type="button" onClick={() => { setCustomerId(''); setCustomerName(''); }} className="btn btn-danger py-1 px-3 text-xs">
                    Alterar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Técnico Responsável</label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="arka-input"
                placeholder="Nome do técnico"
              />
            </div>
          </FormRow>

          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Data de Abertura *</label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                required
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Status da OS</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as OSStatus)} className="arka-select">
                {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </FormRow>

          {/* Os campos seguem a ordem em que a OS é preenchida na prática:
              o que o cliente relatou, o que o técnico deve fazer, o que foi
              constatado e o que foi efetivamente executado. */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Problema Relatado <span className="text-red-400">*</span>
            </label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              rows={4}
              className="arka-input"
              placeholder={
                'Descreva a solicitação ou o defeito nas palavras do cliente. Ex.:\n' +
                'O notebook desliga sozinho depois de uns 10 minutos ligado.\n' +
                'Já aconteceu na tomada e na bateria. Faz um chiado antes de apagar.'
              }
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              O que o cliente informou ao abrir a ordem de serviço. Pode usar várias linhas:
              as quebras são preservadas na OS impressa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Serviço a Executar
            </label>
            <textarea
              value={requestedService}
              onChange={(e) => setRequestedService(e.target.value)}
              rows={3}
              className="arka-input"
              placeholder={
                'Oriente o técnico sobre o que precisa ser feito. Ex.:\n' +
                '1. Fazer backup dos arquivos do usuário antes de qualquer intervenção\n' +
                '2. Substituir o HD pelo SSD de 1TB\n' +
                '3. Instalar o Windows 11 e os programas do consultório\n' +
                '4. Testar por 2h e devolver com a nota fiscal'
              }
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Instruções e escopo do trabalho. Sai impresso na OS para o técnico acompanhar.
            </p>
          </div>

          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Diagnóstico Técnico</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={3}
                className="arka-input"
                placeholder="Parecer técnico / defeito constatado na bancada..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Solução Executada</label>
              <textarea
                value={executedSolution}
                onChange={(e) => setExecutedSolution(e.target.value)}
                rows={3}
                className="arka-input"
                placeholder="Reparos e procedimentos efetivamente realizados..."
              />
            </div>
          </FormRow>

          {/* Products Table */}
          <div className="arka-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Produtos / Peças Utilizadas</h3>
            <div>
              <input
                type="text"
                placeholder="Buscar produto por nome, SKU ou código de barras..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="arka-input"
              />
              {availableProducts.length > 0 && (
                <div className="autocomplete-results">
                  {availableProducts.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="autocomplete-item"
                    >
                      <span className="truncate">
                        {p.name}
                        <span className="text-[var(--text-muted)]"> · {p.currentStock} {p.unit} em estoque</span>
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 tabular">
                        {formatCurrency(p.salePrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="arka-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">V. Unit</th>
                    <th className="text-right">Desc.</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i}>
                      <td className="font-medium text-xs">{p.productName}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="1"
                          value={p.quantity}
                          onChange={(e) => updateProduct(i, 'quantity', Number(e.target.value))}
                          className="arka-input text-center w-16 p-1 text-xs"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={p.unitPrice}
                          onChange={(e) => updateProduct(i, 'unitPrice', Number(e.target.value))}
                          className="arka-input text-right w-24 p-1 text-xs"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={p.discount}
                          onChange={(e) => updateProduct(i, 'discount', Number(e.target.value))}
                          className="arka-input text-right w-20 p-1 text-xs text-red-400"
                        />
                      </td>
                      <td className="text-right font-bold text-xs">R$ {p.total.toFixed(2)}</td>
                      <td className="text-right">
                        <button type="button" onClick={() => setProducts(products.filter((_, idx) => idx !== i))} className="text-red-400 text-xs hover:underline">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Services Table */}
          <div className="arka-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Serviços Pretendidos / Mão de Obra</h3>
            <div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Buscar serviço no catálogo ou digitar um nome avulso..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="arka-input"
                />
                <button
                  type="button"
                  onClick={() => serviceSearch.trim() && addService(serviceSearch.trim())}
                  disabled={!serviceSearch.trim()}
                  className="btn btn-secondary shrink-0"
                >
                  Adicionar avulso
                </button>
              </div>
              {availableServices.length > 0 && (
                <div className="autocomplete-results">
                  {availableServices.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => addService(s)}
                      className="autocomplete-item"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="font-semibold text-arka-500 shrink-0 tabular">
                        {formatCurrency(s.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="arka-table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">V. Unit</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={i}>
                      <td className="font-medium text-xs">{s.name}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="1"
                          value={s.quantity}
                          onChange={(e) => updateService(i, 'quantity', Number(e.target.value))}
                          className="arka-input text-center w-16 p-1 text-xs"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={s.unitPrice}
                          onChange={(e) => updateService(i, 'unitPrice', Number(e.target.value))}
                          className="arka-input text-right w-24 p-1 text-xs"
                        />
                      </td>
                      <td className="text-right font-bold text-xs">R$ {s.total.toFixed(2)}</td>
                      <td className="text-right">
                        <button type="button" onClick={() => setServices(services.filter((_, idx) => idx !== i))} className="text-red-400 text-xs hover:underline">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="arka-card p-4 bg-[var(--bg-main)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1 text-xs">
                <p>Produtos: <span className="font-bold">R$ {productsTotal.toFixed(2)}</span></p>
                <p>Serviços: <span className="font-bold">R$ {servicesTotal.toFixed(2)}</span></p>
                <p>Subtotal: <span className="font-bold">R$ {subtotal.toFixed(2)}</span></p>
              </div>
              <div className="space-y-2">
                <FormRow cols={2}>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)]">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      className="arka-input text-xs text-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)]">Acréscimo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={surcharge}
                      onChange={(e) => setSurcharge(Number(e.target.value))}
                      className="arka-input text-xs text-blue-400"
                    />
                  </div>
                </FormRow>
                <div className="text-right">
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block">Total Geral OS</span>
                  <span className="text-xl font-extrabold text-green-400">R$ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Observações Internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="arka-input text-xs"
              placeholder="Notas adicionais sobre a ordem de serviço..."
            />
          </div>

      </form>
    </Modal>
  );
};
