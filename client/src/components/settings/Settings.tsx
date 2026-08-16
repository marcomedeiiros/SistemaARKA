import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { admin } from '../../data/operations';
import { CompanySettings } from '../../types';
import { SectionTitle, FormRow } from '../common/FormComponents';
import { useToast } from '../../context/ToastContext';
import { Building2, Save, Download, Upload, RefreshCw, ShieldCheck, Palette } from 'lucide-react';

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'company' | 'system' | 'backup' | 'roles'>('company');
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState<CompanySettings>({
    name: 'Arka Soluções Empresariais LTDA',
    tradeName: 'Sistemas Arka ERP',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 3456-7890',
    whatsapp: '(11) 98765-4321',
    email: 'contato@sistemasarka.com.br',
    address: 'Av. Paulista, 1000 - Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    allowNegativeStock: false,
    logoUrl: '',
    termsAndConditions: 'Garantia de 90 dias para serviços executados e peças substituídas conforme o CDC. Aparelhos não retirados em até 90 dias após a conclusão do serviço poderão ser desfechados ou vendidos para pagamento das custas de reparo.'
  });

  useEffect(() => {
    async function loadSettings() {
      const existing = await db.companySettings.toCollection().first();
      if (existing) {
        setCompany(existing);
      }
    }
    loadSettings();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (company.id) {
        await db.companySettings.put(company);
      } else {
        const id = await db.companySettings.add(company);
        setCompany({ ...company, id });
      }
      showToast('Configurações da empresa salvas com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /** Baixa o conteúdo completo do banco (montado pelo servidor) como arquivo JSON. */
  const handleExportBackup = async () => {
    setLoading(true);
    try {
      const backupData = await admin.backup();

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `sistemas_arka_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Backup exportado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Erro ao exportar backup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restaura um backup. O servidor limpa e reinsere tudo em uma transação,
   * preservando os ids para não quebrar as referências entre os registros.
   */
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(String(event.target?.result ?? ''));

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('Arquivo de backup inválido.');
        }

        const confirmRestore = window.confirm(
          'ATENÇÃO: a restauração substituirá todos os dados atuais pelos dados do backup. Deseja continuar?'
        );
        if (!confirmRestore) return;

        setLoading(true);
        await admin.restore(data);

        const restored = await db.companySettings.toCollection().first();
        if (restored) setCompany(restored);

        showToast('Dados restaurados com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showToast(
          err instanceof Error
            ? `Falha ao restaurar: ${err.message}`
            : 'Falha ao restaurar o backup. Verifique se o arquivo JSON está correto.',
          'error'
        );
      } finally {
        setLoading(false);
        // Libera o input para permitir reenviar o mesmo arquivo.
        input.value = '';
      }
    };

    reader.onerror = () => {
      showToast('Não foi possível ler o arquivo selecionado.', 'error');
      input.value = '';
    };

    reader.readAsText(file);
  };

  const handleResetDemoData = async () => {
    const confirmReset = window.confirm(
      'Deseja redefinir todo o banco de dados para os dados iniciais de demonstração? Seus dados personalizados serão apagados.'
    );
    if (!confirmReset) return;

    setLoading(true);
    try {
      await admin.seed();

      const restored = await db.companySettings.toCollection().first();
      if (restored) setCompany(restored);

      showToast('Banco de dados redefinido para a demonstração!', 'info');
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : 'Erro ao redefinir banco de dados.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <SectionTitle title="Configurações do Sistema" subtitle="Gerencie os dados da empresa, backups e preferências" />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] overflow-x-auto gap-2">
        {[
          { id: 'company', label: 'Dados da Empresa', icon: <Building2 size={16} /> },
          { id: 'system', label: 'Preferências do Sistema', icon: <Palette size={16} /> },
          { id: 'backup', label: 'Backup e Restauração', icon: <Download size={16} /> },
          { id: 'roles', label: 'Perfis e Permissões', icon: <ShieldCheck size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Company Info */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="arka-card p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <Building2 size={18} className="text-blue-400" /> Identificação e Cabeçalho de Documentos
          </h3>
          
          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Razão Social *</label>
              <input
                type="text"
                required
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Nome Fantasia *</label>
              <input
                type="text"
                required
                value={company.tradeName}
                onChange={(e) => setCompany({ ...company, tradeName: e.target.value })}
                className="arka-input"
              />
            </div>
          </FormRow>

          <FormRow cols={3}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">CNPJ / CPF *</label>
              <input
                type="text"
                required
                value={company.cnpj}
                onChange={(e) => setCompany({ ...company, cnpj: e.target.value })}
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Telefone Principal</label>
              <input
                type="text"
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">WhatsApp Comercial</label>
              <input
                type="text"
                value={company.whatsapp}
                onChange={(e) => setCompany({ ...company, whatsapp: e.target.value })}
                className="arka-input"
              />
            </div>
          </FormRow>

          <FormRow cols={2}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">URL da Logomarca (Imagem HD)</label>
              <input
                type="url"
                value={company.logoUrl || ''}
                onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
                className="arka-input"
                placeholder="https://suaempresa.com.br/logo.png"
              />
            </div>
          </FormRow>

          <FormRow cols={3}>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Endereço Completo</label>
              <input
                type="text"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                className="arka-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cidade / UF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className="arka-input flex-1"
                />
                <input
                  type="text"
                  value={company.state}
                  onChange={(e) => setCompany({ ...company, state: e.target.value })}
                  className="arka-input w-16 text-center uppercase"
                  maxLength={2}
                />
              </div>
            </div>
          </FormRow>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Termos e Condições Padrão (Impressos nas OS/Recibos)</label>
            <textarea
              rows={3}
              value={company.termsAndConditions || ''}
              onChange={(e) => setCompany({ ...company, termsAndConditions: e.target.value })}
              className="arka-input text-xs"
              placeholder="Digite aqui as regras de garantia, prazos e políticas de recolhimento de aparelhos..."
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
            <button type="submit" disabled={loading} className="btn btn-primary flex items-center gap-2">
              <Save size={16} />
              <span>{loading ? 'Salvando...' : 'Salvar Dados da Empresa'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: System Rules */}
      {activeTab === 'system' && (
        <div className="arka-card p-4 sm:p-6 space-y-5">
          <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <Palette size={18} className="text-purple-400" /> Regras Operacionais e Estoque
          </h3>

          <div className="space-y-4 max-w-2xl">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/50 cursor-pointer hover:bg-[var(--border-color)]/20 transition">
              <input
                type="checkbox"
                checked={company.allowNegativeStock}
                onChange={async (e) => {
                  const updated = { ...company, allowNegativeStock: e.target.checked };
                  setCompany(updated);
                  if (updated.id) await db.companySettings.put(updated);
                  showToast(`Permissão de estoque negativo ${e.target.checked ? 'ativada' : 'desativada'}.`, 'info');
                }}
                className="mt-1 w-5 h-5 rounded text-blue-500"
              />
              <div>
                <p className="font-semibold text-sm text-[var(--text-main)]">Permitir Vendas com Estoque Insuficiente (Negativo)</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Se ativado, o sistema permitirá realizar vendas e fechar Ordens de Serviço mesmo que a quantidade atual do produto em estoque seja zero ou menor que o solicitado.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="arka-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Download size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text-main)]">Exportar Backup Completo</h4>
                <p className="text-xs text-[var(--text-muted)]">Salvar todos os cadastros e histórico em arquivo JSON</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Gere uma cópia de segurança de todos os clientes, vendas, ordens de serviço, produtos e movimentações financeiras para guardar em local seguro.
            </p>
            <button onClick={handleExportBackup} className="btn btn-success w-full flex items-center justify-center gap-2 mt-2">
              <Download size={16} /> Baixar Arquivo de Backup (.JSON)
            </button>
          </div>

          <div className="arka-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text-main)]">Restaurar Backup do Sistema</h4>
                <p className="text-xs text-[var(--text-muted)]">Carregar dados a partir de um arquivo de backup prévio</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Carregue um arquivo `.json` exportado previamente para restaurar o estado completo do banco de dados do sistema.
            </p>
            <label className="btn btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer mt-2">
              <Upload size={16} /> Selecionar Arquivo JSON
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          <div className="arka-card p-5 space-y-3 md:col-span-2 border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
                <RefreshCw size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-red-400">Redefinir para Dados Demonstrativos</h4>
                <p className="text-xs text-[var(--text-muted)]">Reset de fábrica com catálogo e movimentações de teste</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Use esta opção caso queira limpar todos os registros criados e restaurar a base com clientes, produtos e vendas modelo originais do Sistemas Arka.
            </p>
            <button onClick={handleResetDemoData} className="btn btn-danger text-xs py-2 px-4">
              Restaurar Dados Demonstrativos
            </button>
          </div>
        </div>
      )}

      {/* Tab: Roles & Security */}
      {activeTab === 'roles' && (
        <div className="arka-card p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" /> Matriz de Permissões de Acesso
          </h3>

          <div className="overflow-x-auto">
            <table className="arka-table">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th className="text-center">Admin</th>
                  <th className="text-center">Vendedor</th>
                  <th className="text-center">Técnico</th>
                  <th className="text-center">Financeiro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Dashboard Executivo', admin: true, seller: true, tech: true, fin: true },
                  { name: 'Gestão de Clientes', admin: true, seller: true, tech: true, fin: true },
                  { name: 'Ordens de Serviço (OS)', admin: true, seller: false, tech: true, fin: false },
                  { name: 'Vendas & PDV', admin: true, seller: true, tech: false, fin: false },
                  { name: 'Catálogo de Produtos', admin: true, seller: true, tech: true, fin: false },
                  { name: 'Catálogo de Serviços', admin: true, seller: false, tech: true, fin: false },
                  { name: 'Controle de Estoque', admin: true, seller: true, tech: true, fin: false },
                  { name: 'Contas a Pagar / Receber', admin: true, seller: false, tech: false, fin: true },
                  { name: 'Gestão de Fornecedores', admin: true, seller: false, tech: false, fin: false },
                  { name: 'Relatórios de Gestão', admin: true, seller: true, tech: true, fin: true },
                  { name: 'Usuários & Permissões', admin: true, seller: false, tech: false, fin: false },
                  { name: 'Configurações Globais', admin: true, seller: false, tech: false, fin: false }
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-xs sm:text-sm">{row.name}</td>
                    <td className="text-center">{row.admin ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">✕</span>}</td>
                    <td className="text-center">{row.seller ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">✕</span>}</td>
                    <td className="text-center">{row.tech ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">✕</span>}</td>
                    <td className="text-center">{row.fin ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">✕</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
