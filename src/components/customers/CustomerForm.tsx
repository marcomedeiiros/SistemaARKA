import React, { useState } from 'react';
import { db } from '../../db/db';
import { Customer } from '../../types';
import { FormGroup, FormRow, Alert } from '../common/FormComponents';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSave: () => void;
}

const emptyForm: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', document: '', phone: '', whatsapp: '', email: '',
  zipCode: '', address: '', number: '', neighborhood: '', city: '', state: '', notes: ''
};

export const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSave }) => {
  const [form, setForm] = useState(customer ? { ...customer } : { ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const fetchZip = async (zip: string) => {
    const cleaned = zip.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setZipLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          address: data.logradouro || f.address,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state
        }));
      }
    } catch {/* ignore */} finally {
      setZipLoading(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.phone.trim()) errs.phone = 'Telefone é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      if (customer?.id) {
        await db.customers.put({ ...form, id: customer.id, updatedAt: now } as Customer);
      } else {
        await db.customers.add({ ...form, createdAt: now, updatedAt: now } as Customer);
      }
      setAlert({ type: 'success', message: 'Cliente salvo com sucesso!' });
      setTimeout(() => { onSave(); onClose(); }, 800);
    } catch (err: any) {
      setAlert({ type: 'error', message: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <FormRow cols={2}>
        <FormGroup label="Nome / Razão Social" required error={errors.name}>
          <input className="arka-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: João Silva ou Empresa LTDA" />
        </FormGroup>
        <FormGroup label="CPF / CNPJ" error={errors.document}>
          <input className="arka-input" value={form.document} onChange={(e) => set('document', e.target.value)} placeholder="000.000.000-00" />
        </FormGroup>
      </FormRow>

      <FormRow cols={2}>
        <FormGroup label="Telefone" required error={errors.phone}>
          <input className="arka-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 3000-0000" />
        </FormGroup>
        <FormGroup label="WhatsApp">
          <input className="arka-input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 90000-0000" />
        </FormGroup>
      </FormRow>

      <FormGroup label="E-mail">
        <input type="email" className="arka-input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contato@email.com.br" />
      </FormGroup>

      <div className="border-t border-[var(--border-color)] pt-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Endereço</p>
        <FormRow cols={2}>
          <FormGroup label="CEP" hint={zipLoading ? 'Buscando endereço...' : ''}>
            <input
              className="arka-input"
              value={form.zipCode}
              onChange={(e) => set('zipCode', e.target.value)}
              onBlur={(e) => fetchZip(e.target.value)}
              placeholder="00000-000"
            />
          </FormGroup>
          <FormGroup label="Estado">
            <input className="arka-input" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="SP" maxLength={2} />
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <div className="sm:col-span-2">
            <FormGroup label="Logradouro (Rua/Av.)">
              <input className="arka-input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua das Flores" />
            </FormGroup>
          </div>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Número">
            <input className="arka-input" value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="123" />
          </FormGroup>
          <FormGroup label="Bairro">
            <input className="arka-input" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Centro" />
          </FormGroup>
          <FormGroup label="Cidade">
            <input className="arka-input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="São Paulo" />
          </FormGroup>
        </FormRow>
      </div>

      <FormGroup label="Observações">
        <textarea className="arka-input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anotações internas sobre o cliente..." />
      </FormGroup>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvando...' : customer?.id ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
};
