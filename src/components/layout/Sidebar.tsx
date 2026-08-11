import React, { useState } from 'react';
import {
  LayoutDashboard, Users, ClipboardList, ShoppingCart, Package,
  Wrench, DollarSign, Truck, BarChart3, UserCog, Settings,
  ChevronLeft, ChevronRight, Layers, Building2
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

export const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = useAuth();

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '240px',
        minHeight: '100vh',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Building2 size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Sistemas</p>
            <p className="text-blue-400 font-extrabold text-base leading-tight">Arka</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const allowed = hasPermission(item.permission);
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              onClick={() => allowed && onNavigate(item.key)}
              title={collapsed ? item.label : undefined}
              className="w-full text-left flex items-center gap-3 transition-all duration-150"
              style={{
                padding: collapsed ? '10px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive ? '#3b82f6' : allowed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: allowed ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!collapsed && !allowed && (
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

      {/* Collapse Toggle */}
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
    </aside>
  );
};
