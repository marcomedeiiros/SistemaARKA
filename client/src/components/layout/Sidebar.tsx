import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, ClipboardList, ShoppingCart, Package,
  Wrench, DollarSign, Truck, BarChart3, UserCog, Settings,
  ChevronLeft, ChevronRight, Layers, Building2, X, Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';

export type ActiveModule =
  | 'dashboard'
  | 'customers'
  | 'os'
  | 'sales'
  | 'products'
  | 'services'
  | 'stock'
  | 'financial'
  | 'suppliers'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  active: ActiveModule;
  onNavigate: (module: ActiveModule) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  key: ActiveModule;
  label: string;
  icon: React.ReactNode;
  permission: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/** Navegação agrupada por área, para não ser uma lista corrida de 12 itens. */
const navSections: NavSection[] = [
  {
    label: 'Visão geral',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'dashboard' },
      { key: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} />, permission: 'reports' }
    ]
  },
  {
    label: 'Operação',
    items: [
      { key: 'os', label: 'Ordens de Serviço', icon: <ClipboardList size={18} />, permission: 'os' },
      { key: 'sales', label: 'Vendas / PDV', icon: <ShoppingCart size={18} />, permission: 'sales' },
      { key: 'customers', label: 'Clientes', icon: <Users size={18} />, permission: 'customers' }
    ]
  },
  {
    label: 'Catálogo',
    items: [
      { key: 'products', label: 'Produtos', icon: <Package size={18} />, permission: 'products' },
      { key: 'services', label: 'Serviços', icon: <Wrench size={18} />, permission: 'services' },
      { key: 'stock', label: 'Estoque', icon: <Layers size={18} />, permission: 'products' },
      { key: 'suppliers', label: 'Fornecedores', icon: <Truck size={18} />, permission: 'suppliers' }
    ]
  },
  {
    label: 'Administração',
    items: [
      { key: 'financial', label: 'Financeiro', icon: <DollarSign size={18} />, permission: 'financial' },
      { key: 'users', label: 'Usuários', icon: <UserCog size={18} />, permission: 'users' },
      { key: 'settings', label: 'Configurações', icon: <Settings size={18} />, permission: 'settings' }
    ]
  }
];

const COLLAPSE_KEY = 'arka_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate, mobileOpen, onMobileClose }) => {
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  // Na gaveta mobile, ESC fecha.
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, mobileOpen, onMobileClose]);

  // Impede o fundo de rolar enquanto a gaveta está aberta.
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, mobileOpen]);

  const handleSelect = (key: ActiveModule, allowed: boolean) => {
    if (!allowed) return;
    onNavigate(key);
    if (isMobile) onMobileClose?.();
  };

  // No desktop a barra é sempre visível; no mobile só quando a gaveta abre.
  if (isMobile && !mobileOpen) return null;

  const isCompact = collapsed && !isMobile;

  return (
    <>
      {isMobile && mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={`sidebar ${isMobile ? 'sidebar-drawer' : ''} ${isCompact ? 'sidebar-compact' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-brand">
          {/* O logo é horizontal (~4:1), então na barra recolhida cede lugar
              ao símbolo quadrado. */}
          {isCompact ? (
            <div className="sidebar-logo" title="Sistemas Arka">
              <Building2 size={18} />
            </div>
          ) : (
            <img
              src="/arka-horizontal.webp"
              alt="Sistemas Arka"
              className="sidebar-brand-logo"
              width={640}
              height={160}
            />
          )}

          {isMobile && (
            <button
              onClick={onMobileClose}
              className="sidebar-close"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => {
            const visibleItems = section.items;

            return (
              <div key={section.label} className="sidebar-section">
                {!isCompact && <p className="sidebar-section-label">{section.label}</p>}

                {visibleItems.map((item) => {
                  const allowed = hasPermission(item.permission);
                  const isActive = active === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelect(item.key, allowed)}
                      disabled={!allowed}
                      title={isCompact ? item.label : !allowed ? 'Seu perfil não tem acesso' : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sidebar-item ${isActive ? 'is-active' : ''} ${allowed ? '' : 'is-locked'}`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!isCompact && <span className="truncate">{item.label}</span>}
                      {!isCompact && !allowed && <Lock size={12} className="ml-auto shrink-0 opacity-70" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {!isMobile && (
          <div className="sidebar-footer">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-collapse"
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!collapsed && <span className="text-xs font-medium">Recolher</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
