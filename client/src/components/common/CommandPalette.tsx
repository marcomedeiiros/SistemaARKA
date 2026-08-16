import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../db/db';
import { ActiveModule } from '../layout/Sidebar';
import { Search, User, ClipboardList, ShoppingCart, Package, X, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: ActiveModule) => void;
}

interface SearchResultItem {
  id: string;
  type: 'navigation' | 'customer' | 'os' | 'sale' | 'product';
  title: string;
  subtitle: string;
  module: ActiveModule;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via custom event or parent callback
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const searchAll = async () => {
      const q = query.toLowerCase().trim();
      const list: SearchResultItem[] = [];

      // Default quick navigation
      if (!q) {
        list.push(
          { id: 'nav-dashboard', type: 'navigation', title: 'Ir para Dashboard', subtitle: 'Visão geral e gráficos', module: 'dashboard' },
          { id: 'nav-os', type: 'navigation', title: 'Ir para Ordens de Serviço', subtitle: 'Gerenciar OS e assistência', module: 'os' },
          { id: 'nav-sales', type: 'navigation', title: 'Ir para Vendas / PDV', subtitle: 'Registrar caixa e vendas', module: 'sales' },
          { id: 'nav-customers', type: 'navigation', title: 'Ir para Clientes', subtitle: 'Cadastro de clientes', module: 'customers' },
          { id: 'nav-products', type: 'navigation', title: 'Ir para Produtos', subtitle: 'Estoque e catálogo', module: 'products' },
          { id: 'nav-settings', type: 'navigation', title: 'Ir para Configurações', subtitle: 'Empresa, backup e tema', module: 'settings' }
        );
        setResults(list);
        return;
      }

      // Os campos usam `?? ''` porque um registro com campo vazio quebrava a busca.
      const customers = await db.customers
        .filter(
          (c) =>
            (c.name ?? '').toLowerCase().includes(q) ||
            (c.document ?? '').toLowerCase().includes(q) ||
            (c.phone ?? '').toLowerCase().includes(q)
        )
        .limit(3)
        .toArray();
      customers.forEach((c) => {
        list.push({
          id: `customer-${c.id}`,
          type: 'customer',
          title: c.name,
          subtitle: `Doc: ${c.document || 'N/I'} • Tel: ${c.phone || 'N/I'}`,
          module: 'customers'
        });
      });

      // Search Service Orders
      const serviceOrders = await db.serviceOrders
        .filter(
          (os) =>
            (os.code ?? '').toLowerCase().includes(q) ||
            (os.customerName ?? '').toLowerCase().includes(q) ||
            (os.problemDescription ?? '').toLowerCase().includes(q)
        )
        .limit(3)
        .toArray();
      serviceOrders.forEach((os) => {
        list.push({
          id: `os-${os.id}`,
          type: 'os',
          title: `OS ${os.code} - ${os.customerName}`,
          subtitle: `Status: ${os.status.toUpperCase()} • R$ ${os.total.toFixed(2)}`,
          module: 'os'
        });
      });

      // Search Sales
      const sales = await db.sales
        .filter(
          (s) =>
            (s.code ?? '').toLowerCase().includes(q) ||
            (s.customerName ?? '').toLowerCase().includes(q)
        )
        .limit(3)
        .toArray();
      sales.forEach((s) => {
        list.push({
          id: `sale-${s.id}`,
          type: 'sale',
          title: `Venda ${s.code} - ${s.customerName}`,
          subtitle: `Total: R$ ${s.total.toFixed(2)} • ${s.paymentMethod.toUpperCase()}`,
          module: 'sales'
        });
      });

      // Search Products
      const products = await db.products
        .filter(
          (p) =>
            (p.name ?? '').toLowerCase().includes(q) ||
            (p.sku ?? '').toLowerCase().includes(q) ||
            (p.barcode ?? '').toLowerCase().includes(q)
        )
        .limit(3)
        .toArray();
      products.forEach((p) => {
        list.push({
          id: `prod-${p.id}`,
          type: 'product',
          title: p.name,
          subtitle: `SKU: ${p.sku} • Preço: R$ ${p.salePrice.toFixed(2)} • Estoque: ${p.currentStock}`,
          module: 'products'
        });
      });

      setResults(list);
      setHighlight(0);
    };

    searchAll().catch((error: unknown) => {
      console.error('[arka] falha na busca rápida:', error);
      setResults([]);
    });
  }, [query, isOpen]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onNavigate(item.module);
      onClose();
    },
    [onNavigate, onClose]
  );

  // Setas navegam, Enter abre o item destacado.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight((current) => (results.length ? (current + 1) % results.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((current) =>
          results.length ? (current - 1 + results.length) % results.length : 0
        );
      } else if (event.key === 'Enter') {
        const item = results[highlight];
        if (item) {
          event.preventDefault();
          handleSelect(item);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, highlight, handleSelect]);

  if (!isOpen) return null;

  const getIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'customer': return <User size={16} className="text-blue-400" />;
      case 'os': return <ClipboardList size={16} className="text-amber-400" />;
      case 'sale': return <ShoppingCart size={16} className="text-emerald-400" />;
      case 'product': return <Package size={16} className="text-purple-400" />;
      default: return <ArrowRight size={16} className="text-[var(--text-muted)]" />;
    }
  };

  return (
    <div
      className="palette-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida"
    >
      <div className="palette-panel" onMouseDown={(e) => e.stopPropagation()}>
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-color)] gap-3">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar clientes, OS, vendas, produtos..."
            className="w-full bg-transparent outline-none text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-[var(--text-muted)] hover:text-red-400">
              Limpar
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlight(index)}
                  aria-selected={index === highlight}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                    index === highlight ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-[var(--text-main)] truncate">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className={`text-[var(--text-muted)] shrink-0 ml-2 transition-opacity ${
                      index === highlight ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-color)] flex flex-wrap gap-x-3 gap-y-1 justify-between items-center text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] font-mono">↑↓</kbd>
            navegar
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] font-mono">Enter</kbd>
            abrir
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] font-mono">Esc</kbd>
            sair
          </span>
          <span>Busca rápida do Sistemas Arka</span>
        </div>
      </div>
    </div>
  );
};
