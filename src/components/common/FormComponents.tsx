import React from 'react';

interface FormGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ label, required, error, children, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-[var(--text-main)]">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

interface FormRowProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

export const FormRow: React.FC<FormRowProps> = ({ children, cols = 2 }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      gap: '1rem'
    }}
    className="form-row"
    data-cols={cols}
    >{children}</div>
  );
};

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, action }) => (
  <div className="section-title-row">
    <div>
      <h2 className="text-xl font-bold text-[var(--text-main)] leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="relative my-5">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-[var(--border-color)]" />
    </div>
    {label && (
      <div className="relative flex justify-center text-xs">
        <span className="px-3 bg-[var(--bg-card)] text-[var(--text-muted)] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
    )}
  </div>
);

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const alertStyles = {
  success: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6' }
};

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const s = alertStyles[type];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium animate-fade-in"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; label?: string }> = ({
  size = 'md',
  label
}) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      <div className={`${sizeClass} border-2 border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
    </div>
  );
};

export const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

export const formatCPFCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
      [a, b, c].join('.') + (d ? '-' + d : '')
    );
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
    `${a}.${b}.${c}/${d}` + (e ? '-' + e : '')
  );
};

export const paymentMethodLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  fiado: 'Fiado/A Receber'
};

export const osStatusLabel: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  aguardando_aprovacao: 'Aguard. Aprovação',
  aprovada: 'Aprovada',
  em_execucao: 'Em Execução',
  aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  entregue: 'Entregue'
};

export const osStatusColor: Record<string, string> = {
  aberta: 'badge-blue',
  em_analise: 'badge-purple',
  aguardando_aprovacao: 'badge-amber',
  aprovada: 'badge-green',
  em_execucao: 'badge-blue',
  aguardando_peca: 'badge-amber',
  concluida: 'badge-green',
  cancelada: 'badge-red',
  entregue: 'badge-slate'
};

export const financialStatusColor: Record<string, string> = {
  pendente: 'badge-amber',
  pago: 'badge-green',
  vencido: 'badge-red',
  cancelado: 'badge-slate'
};

export const financialStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado'
};

// Re-export StatCard for convenience
export { StatCard } from './StatCard';
