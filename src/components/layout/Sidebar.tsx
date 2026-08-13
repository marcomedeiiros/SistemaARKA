import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, ClipboardList, ShoppingCart, Package,
  Wrench, DollarSign, Truck, BarChart3, UserCog, Settings,
  ChevronLeft, ChevronRight, Layers, Building2, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

const navItems: {
  key: ActiveModule;
  label: string;
  icon: React.ReactNode;
  permission: string;
}[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'dashboard' },
  { key: 'customers', label: 'Clientes', icon: <Users size={18} />, permission: 'customers' },
  { key: 'os', label: 'Ordens de Serviço', icon: <ClipboardList size={18} />, permission: 'os' },
  { key: 'sales', label: 'Vendas / PDV', icon: <ShoppingCart size={18} />, permission: 'sales' },
  { key: 'products', label: 'Produtos', icon: <Package size={18} />, permission: 'products' },
  { key: 'services', label: 'Serviços', icon: <Wrench size={18} />, permission: 'services' },
  { key: 'stock', label: 'Estoque', icon: <Layers size={18} />, permission: 'products' },
  { key: 'financial', label: 'Financeiro', icon: <DollarSign size={18} />, permission: 'financial' },
  { key: 'suppliers', label: 'Fornecedores', icon: <Truck size={18} />, permission: 'suppliers' },
  { key: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} />, permission: 'reports' },
  { key: 'users', label: 'Usuários', icon: <UserCog size={18} />, permission: 'users' },
  { key: 'settings', label: 'Configurações', icon: <Settings size={18} />, permission: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate, mobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { hasPermission } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelect = (key: ActiveModule, allowed: boolean) => {
    if (allowed) {
      onNavigate(key);
      if (isMobile && onMobileClose) {
        onMobileClose();
      }
    }
  };

  // If on mobile and menu is closed, do not render sidebar overlay
  if (isMobile && !mobileOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
          onClick={onMobileClose}
        />
      )}

      <aside
        className="sidebar"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          zIndex: isMobile ? 50 : 10,
          width: isMobile ? '260px' : collapsed ? '64px' : 'var(--sidebar-width)',
          minHeight: '100vh',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0
        }}
      >
        {/* Header / Logo */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.05)', minHeight: '72px' }}
        >
          <div className={`flex items-center gap-2.5 ${collapsed && !isMobile ? 'w-full justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Building2 size={18} className="text-white" />
            </div>
            {(!collapsed || isMobile) && (
              <div className="overflow-hidden">
                <p className="text-white font-bold text-sm leading-tight">Sistemas</p>
                <p className="text-blue-400 font-extrabold text-base leading-tight">Arka</p>
              </div>
            )}
          </div>

          {/* Close button ONLY for mobile drawer */}
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const allowed = hasPermission(item.permission);
            const isActive = active === item.key;
            const isCollapsedState = collapsed && !isMobile;

            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key, allowed)}
                title={isCollapsedState ? item.label : undefined}
                className="w-full text-left flex items-center gap-3 transition-all duration-150"
                style={{
                  padding: isCollapsedState ? '10px 0' : '10px 16px',
                  justifyContent: isCollapsedState ? 'center' : 'flex-start',
                  color: isActive ? '#3b82f6' : allowed ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)',
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  cursor: allowed ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsedState && <span className="truncate">{item.label}</span>}
                {!isCollapsedState && !allowed && (
                  <span
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                  >
                    SEM ACESSO
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle (Desktop only) */}
        {!isMobile && (
          <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
