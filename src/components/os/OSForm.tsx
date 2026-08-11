import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { osService } from '../../services/osService';
import { ServiceOrder, Customer, Product, Service, ServiceOrderItem, OSStatus } from '../../types';
import { FormGroup, FormRow } from '../common/FormComponents';

interface OSFormProps {
  os?: ServiceOrder;
  onSave: () => void;
  onClose: () => void;
}

export const OSForm: React.FC<OSFormProps> = ({ os, onSave, onClose }) => {
  const [customerId, setCustomerId] = useState<number | ''>(os?.customerId || '');
  const [technicianName, setTechnicianName] = useState(os?.technicianName || '');
  const [openingDate, setOpeningDate] = useState(os?.openingDate?.toISOString().substring(0, 10) || new Date().toISOString().substring(0, 10));
  const [status, setStatus] = useState<OSStatus>(os?.status || 'aberta');
  const [problemDescription, setProblemDescription] = useState(os?.problemDescription || '');
  const [diagnosis, setDiagnosis] = useState(os?.diagnosis || '');
  const [executedSolution, setExecutedSolution] = useState(os?.executedSolution || '');
  const [notes, setNotes] = useState(os?.notes || '');
  
  const [products, setProducts] = useState<ServiceOrderItem[]>(os?.products || []);
  const [services, setServices] = useState<ServiceOrderItem[]>(os?.services || []);
  
  const [globalDiscount, setGlobalDiscount] = useState(os?.discount || 0);
  const [surcharge, setSurcharge] = useState(os?.surcharge || 0);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

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

  const addProduct = (product: Product) => {
    setProducts([...products, {
      referenceId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      discount: 0,
      total: product.price
    }]);
    setProductSearch('');
  };

  const addService = (service: Service | string) => {
    if (typeof service === 'string') {
        setServices([...services, {
            name: service,
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0
        }]);
    } else {
        setServices([...services, {
            referenceId: service.id,
            name: service.name,
            quantity: 1,
            unitPrice: service.price,
            discount: 0,
            total: service.price
          }]);
    }
    setServiceSearch('');
  };

  const updateProduct = (index: number, field: keyof ServiceOrderItem, value: number) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    newProducts[index].total = (newProducts[index].quantity * newProducts[index].unitPrice) - (newProducts[index].discount || 0);
    setProducts(newProducts);
  };

  const updateService = (index: number, field: keyof ServiceOrderItem, value: number) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    newServices[index].total = (newServices[index].quantity * newServices[index].unitPrice) - (newServices[index].discount || 0);
    setServices(newServices);
  };

  const productsTotal = products.reduce((acc, p) => acc + p.total, 0);
  const servicesTotal = services.reduce((acc, s) => acc + s.total, 0);
  const subtotal = productsTotal + servicesTotal;
  const grandTotal = subtotal - globalDiscount + surcharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !openingDate || !problemDescription) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    const osData: Omit<ServiceOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'> = {
      customerId: Number(customerId),
      technicianName,
      openingDate: new Date(openingDate),
      status,
      problemDescription,
      diagnosis,
      executedSolution,
      notes,
      products,
      services,
      subtotal,
      discount: globalDiscount,
      surcharge,
      totalAmount: grandTotal,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center overflow-y-auto p-4 z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl my-8">
        <h2 className="text-2xl font-bold mb-4">{os ? 'Editar OS' : 'Nova Ordem de Serviço'}</h2>
        <form onSubmit={handleSubmit}>
          
          <FormRow>
             <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Cliente *</label>
                {!customerId ? (
                    <div>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                        />
                        {customers.length > 0 && (
                            <ul className="border border-gray-300 mt-1 rounded-md max-h-40 overflow-y-auto">
                                {customers.map(c => (
                                    <li key={c.id} onClick={() => setCustomerId(c.id!)} className="p-2 hover:bg-gray-100 cursor-pointer">
                                        {c.name} ({c.phone})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center mt-1">
                        <span className="p-2 border rounded-md bg-gray-50 flex-1">Cliente Selecionado ID: {customerId}</span>
                        <button type="button" onClick={() => setCustomerId('')} className="ml-2 text-red-600 font-bold">X</button>
                    </div>
                )}
            </div>
            <FormGroup label="Técnico" value={technicianName} onChange={setTechnicianName} />
          </FormRow>

          <FormRow>
            <FormGroup label="Data de Abertura *" type="date" value={openingDate} onChange={setOpeningDate} required />
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as OSStatus)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                    {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </FormRow>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Problema Relatado *</label>
            <textarea value={problemDescription} onChange={e => setProblemDescription(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" rows={3}></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Diagnóstico</label>
            <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" rows={3}></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Solução Executada</label>
            <textarea value={executedSolution} onChange={e => setExecutedSolution(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" rows={3}></textarea>
          </div>

          <div className="mb-4 border p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Produtos</h3>
              <input type="text" placeholder="Buscar produto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 border mb-2"/>
              {availableProducts.length > 0 && (
                    <ul className="border border-gray-300 rounded-md max-h-40 overflow-y-auto mb-2">
                        {availableProducts.map(p => (
                            <li key={p.id} onClick={() => addProduct(p)} className="p-2 hover:bg-gray-100 cursor-pointer">
                                {p.name} - R$ {p.price.toFixed(2)}
                            </li>
                        ))}
                    </ul>
                )}
              <table className="min-w-full divide-y divide-gray-200 mt-2">
                  <thead><tr><th>Nome</th><th>Qtd</th><th>Preço Un.</th><th>Desconto</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                      {products.map((p, i) => (
                          <tr key={i}>
                              <td>{p.name}</td>
                              <td><input type="number" min="1" value={p.quantity} onChange={(e) => updateProduct(i, 'quantity', Number(e.target.value))} className="w-16 border p-1"/></td>
                              <td><input type="number" step="0.01" value={p.unitPrice} onChange={(e) => updateProduct(i, 'unitPrice', Number(e.target.value))} className="w-24 border p-1"/></td>
                              <td><input type="number" step="0.01" value={p.discount} onChange={(e) => updateProduct(i, 'discount', Number(e.target.value))} className="w-24 border p-1"/></td>
                              <td>R$ {p.total.toFixed(2)}</td>
                              <td><button type="button" onClick={() => setProducts(products.filter((_, idx) => idx !== i))} className="text-red-500">Remover</button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          <div className="mb-4 border p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Serviços</h3>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Buscar ou digitar serviço..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 border"/>
                <button type="button" onClick={() => serviceSearch && addService(serviceSearch)} className="px-4 py-2 bg-gray-200 rounded-md">Adicionar Avulso</button>
              </div>
              {availableServices.length > 0 && (
                    <ul className="border border-gray-300 rounded-md max-h-40 overflow-y-auto mb-2">
                        {availableServices.map(s => (
                            <li key={s.id} onClick={() => addService(s)} className="p-2 hover:bg-gray-100 cursor-pointer">
                                {s.name} - R$ {s.price.toFixed(2)}
                            </li>
                        ))}
                    </ul>
                )}
              <table className="min-w-full divide-y divide-gray-200 mt-2">
                  <thead><tr><th>Nome</th><th>Qtd</th><th>Preço Un.</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                      {services.map((s, i) => (
                          <tr key={i}>
                              <td>{s.name}</td>
                              <td><input type="number" min="1" value={s.quantity} onChange={(e) => updateService(i, 'quantity', Number(e.target.value))} className="w-16 border p-1"/></td>
                              <td><input type="number" step="0.01" value={s.unitPrice} onChange={(e) => updateService(i, 'unitPrice', Number(e.target.value))} className="w-24 border p-1"/></td>
                              <td>R$ {s.total.toFixed(2)}</td>
                              <td><button type="button" onClick={() => setServices(services.filter((_, idx) => idx !== i))} className="text-red-500">Remover</button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          <div className="mb-4 border p-4 rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Totais</h3>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <p>Total Produtos: R$ {productsTotal.toFixed(2)}</p>
                      <p>Total Serviços: R$ {servicesTotal.toFixed(2)}</p>
                      <p>Subtotal: R$ {subtotal.toFixed(2)}</p>
                  </div>
                  <div>
                      <FormRow>
                        <FormGroup label="Desconto Global" type="number" value={globalDiscount.toString()} onChange={(v) => setGlobalDiscount(Number(v))} />
                        <FormGroup label="Acréscimo" type="number" value={surcharge.toString()} onChange={(v) => setSurcharge(Number(v))} />
                      </FormRow>
                      <p className="text-xl font-bold mt-2">Total Geral: R$ {grandTotal.toFixed(2)}</p>
                  </div>
              </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Observações (Internas)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" rows={2}></textarea>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar OS</button>
          </div>
        </form>
      </div>
    </div>
  );
};
