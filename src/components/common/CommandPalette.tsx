import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { ActiveModule } from '../layout/Sidebar';
import { Search, User, ClipboardList, ShoppingCart, Package, Settings, X, ArrowRight } from 'lucide-react';

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

      // Search Customers
      const customers = await db.customers
        .filter((c) => c.name.toLowerCase().includes(q) || c.document.includes(q) || c.phone.includes(q))
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
        .filter((os) => os.code.toLowerCase().includes(q) || os.customerName.toLowerCase().includes(q) || os.problemDescription.toLowerCase().includes(q))
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
        .filter((s) => s.code.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q))
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
        .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
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
    };

    searchAll();
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (item: SearchResultItem) => {
    onNavigate(item.module);
    onClose();
  };

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
    <div className="palette-overlay" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] text-[var(--text-main)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
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
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--border-color)]/50 text-left transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[var(--border-color)]/40 flex-shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-[var(--text-main)] truncate">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[var(--border-color)]/20 border-t border-[var(--border-color)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
          <span>Use <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-color)] font-mono">ESC</kbd> para sair</span>
          <span>Sistemas Arka Quick Search</span>
        </div>
      </div>
    </div>
  );
};
