import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { osService } from '../../services/osService';
import { ServiceOrder, Customer, Product, ServiceItemCatalog, OSProduct, OSService, OSStatus } from '../../types';
import { FormRow } from '../common/FormComponents';

interface OSFormProps {
  os?: ServiceOrder;
  onSave: () => void;
  onClose: () => void;
}

export const OSForm: React.FC<OSFormProps> = ({ os, onSave, onClose }) => {
  const [customerId, setCustomerId] = useState<number | ''>(os?.customerId || '');
  const [customerName, setCustomerName] = useState(os?.customerName || '');
  const [technicianName, setTechnicianName] = useState(os?.technicianName || '');
  const [openingDate, setOpeningDate] = useState<string>(
    os?.openingDate ? os.openingDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<OSStatus>(os?.status || 'aberta');
  const [problemDescription, setProblemDescription] = useState(os?.problemDescription || '');
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

  useEffect(() => {
    if (customerSearch) {
      db.customers
        .where('name').startsWithIgnoreCase(customerSearch)
        .or('phone').startsWithIgnoreCase(customerSearch)
        .limit(5)
        .toArray()
        .then(setCustomers);
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (productSearch) {
      db.products
        .where('name').startsWithIgnoreCase(productSearch)
        .limit(5)
        .toArray()
        .then(setAvailableProducts);
    } else {
      setAvailableProducts([]);
    }
  }, [productSearch]);

  useEffect(() => {
    if (serviceSearch) {
      db.services
        .where('name').startsWithIgnoreCase(serviceSearch)
        .limit(5)
        .toArray()
        .then(setAvailableServices);
    } else {
      setAvailableServices([]);
    }
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
    if (!customerId || !openingDate || !problemDescription) {
      alert('Por favor, preencha o cliente, data de abertura e descrição do problema.');
      return;
    }

    const osData: Omit<ServiceOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'> = {
      customerId: Number(customerId),
      customerName: customerName || 'Cliente',
      technicianName: technicianName || 'Técnico Responsável',
      openingDate,
      status,
      problemDescription,
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
        await osService.updateServiceOrder(os.id, osData);
      } else {
        await osService.createServiceOrder(osData);
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      alert('Erro ao salvar Ordem de Serviço.');
    }
  };

  const statusOptions: { value: OSStatus; label: string }[] = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'em_analise', label: 'Em Análise' },
    { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'em_execucao', label: 'Em Execução' },
    { value: 'aguardando_peca', label: 'Aguardando Peça' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'entregue', label: 'Entregue' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-overlay-inner">
      <div
        className="bg-[var(--bg-card)] text-[var(--text-main)] p-6 sm:p-8 rounded-xl w-full max-w-4xl shadow-2xl border border-[var(--border-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{os ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cliente *</label>
              {!customerId ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="arka-input"
                  />
                  {customers.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {customers.map((c) => (
                        <li key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-[var(--border-color)]/50 cursor-pointer text-sm">
                          {c.name} <span className="text-xs text-[var(--text-muted)]">({c.phone})</span>
                        </li>
                      ))}
                    </ul>
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

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Problema Relatado *</label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              rows={2}
              className="arka-input"
              placeholder="Descreva a solicitação ou defeito informado pelo cliente..."
            />
          </div>

          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Diagnóstico Técnico</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={2}
                className="arka-input"
                placeholder="Parecer técnico / defeito constatado..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Solução Executada</label>
              <textarea
                value={executedSolution}
                onChange={(e) => setExecutedSolution(e.target.value)}
                rows={2}
                className="arka-input"
                placeholder="Descrição dos reparos ou procedimentos efetuados..."
              />
            </div>
          </FormRow>

          {/* Products Table */}
          <div className="arka-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Produtos / Peças Utilizadas</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produto por nome ou código..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="arka-input"
              />
              {availableProducts.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                  {availableProducts.map((p) => (
                    <li key={p.id} onClick={() => addProduct(p)} className="p-2 hover:bg-[var(--border-color)]/50 cursor-pointer text-xs flex justify-between">
                      <span>{p.name}</span>
                      <span className="font-bold text-green-400">R$ {p.salePrice.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
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
            <div className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Buscar serviço no catálogo ou digitar nome avulso..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="arka-input"
              />
              <button type="button" onClick={() => serviceSearch && addService(serviceSearch)} className="btn btn-secondary text-xs">
                Adicionar Avulso
              </button>
              {availableServices.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                  {availableServices.map((s) => (
                    <li key={s.id} onClick={() => addService(s)} className="p-2 hover:bg-[var(--border-color)]/50 cursor-pointer text-xs flex justify-between">
                      <span>{s.name}</span>
                      <span className="font-bold text-blue-400">R$ {s.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
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

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Ordem de Serviço</button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};
