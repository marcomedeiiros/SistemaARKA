import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, ChevronDown, Menu, Search, AlertTriangle, ClipboardList, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveModule } from './Sidebar';
import { UserRole } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard Executivo',
  customers: 'Gestão de Clientes',
  os: 'Ordens de Serviço',
  sales: 'Vendas / PDV',
  products: 'Catálogo de Produtos',
  services: 'Catálogo de Serviços',
  stock: 'Controle de Estoque',
  financial: 'Gestão Financeira',
  suppliers: 'Gestão de Fornecedores',
  reports: 'Relatórios de Gestão',
  users: 'Usuários & Permissões',
  settings: 'Configurações do Sistema'
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  technician: 'Técnico',
  financial: 'Financeiro'
};

const roleColors: Record<UserRole, string> = {
  admin: '#3b82f6',
  seller: '#10b981',
  technician: '#f59e0b',
  financial: '#a855f7'
};

interface HeaderProps {
  activeModule: ActiveModule;
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onNavigate?: (module: ActiveModule) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeModule, onOpenMobileMenu, onOpenSearch, onNavigate }) => {
  const { currentUser, allUsers, setCurrentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Live query notifications
  const lowStockCount = useLiveQuery(async () => {
    const products = await db.products.toArray();
    return products.filter((p) => p.currentStock <= p.minStock).length;
  }) || 0;

  const openOsCount = useLiveQuery(async () => {
    const orders = await db.serviceOrders.toArray();
    return orders.filter((o) => o.status === 'aberta' || o.status === 'em_analise').length;
  }) || 0;

  const pendingReceivablesCount = useLiveQuery(async () => {
    const recs = await db.accountsReceivable.toArray();
    return recs.filter((r) => r.status === 'pendente' || r.status === 'vencido').length;
  }) || 0;

  const totalNotifications = lowStockCount + (openOsCount > 0 ? 1 : 0) + (pendingReceivablesCount > 0 ? 1 : 0);

  return (
    <header className="app-header">
      <div className="layout-inner app-header-inner">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isMobile && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition"
            title="Menu de navegação"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="font-bold text-[var(--text-main)] text-sm sm:text-base leading-tight truncate">
            {moduleLabels[activeModule] || activeModule}
          </h1>
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Quick Search Button (Ctrl+K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-blue-500/50 transition bg-[var(--bg-main)]/50"
          title="Busca Rápida (Ctrl+K)"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--border-color)] text-[var(--text-muted)]">
            Ctrl K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)]/60 transition"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)]/60 transition relative"
            title="Notificações"
          >
            <Bell size={18} />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-fade-in bg-[var(--bg-card)] border-[var(--border-color)]">
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
                <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Notificações do Sistema
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                  {totalNotifications} alerta(s)
                </span>
              </div>

              <div className="divide-y divide-[var(--border-color)] max-h-72 overflow-y-auto">
                {lowStockCount > 0 && (
                  <button
                    onClick={() => { setShowNotifications(false); onNavigate?.('stock'); }}
                    className="w-full p-3 flex items-start gap-3 hover:bg-[var(--border-color)]/40 text-left transition"
                  >
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-main)]">Estoque Baixo</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {lowStockCount} produto(s) atingiram ou estão abaixo do estoque mínimo.
                      </p>
                    </div>
                  </button>
                )}

                {openOsCount > 0 && (
                  <button
                    onClick={() => { setShowNotifications(false); onNavigate?.('os'); }}
                    className="w-full p-3 flex items-start gap-3 hover:bg-[var(--border-color)]/40 text-left transition"
                  >
                    <ClipboardList size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-main)]">Ordens de Serviço Abertas</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {openOsCount} OS em aberto ou aguardando análise técnica.
                      </p>
                    </div>
                  </button>
                )}

                {pendingReceivablesCount > 0 && (
                  <button
                    onClick={() => { setShowNotifications(false); onNavigate?.('financial'); }}
                    className="w-full p-3 flex items-start gap-3 hover:bg-[var(--border-color)]/40 text-left transition"
                  >
                    <DollarSign size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-main)]">Contas a Receber</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {pendingReceivablesCount} título(s) pendentes ou aguardando pagamento.
                      </p>
                    </div>
                  </button>
                )}

                {totalNotifications === 0 && (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    Tudo em dia! Nenhuma notificação pendente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-[var(--border-color)]/60 transition"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2px ${roleColors[currentUser.role]}` }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: roleColors[currentUser?.role || 'admin'] }}
              >
                {currentUser?.name[0]}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-[var(--text-main)] leading-tight truncate max-w-[120px]">
                {currentUser?.name}
              </p>
              <p
                className="text-[10px] font-medium leading-tight"
                style={{ color: roleColors[currentUser?.role || 'admin'] }}
              >
                {roleLabels[currentUser?.role || 'admin']}
              </p>
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)] hidden sm:block" />
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-fade-in bg-[var(--bg-card)] border-[var(--border-color)]"
            >
              <div className="px-4 py-3 border-b border-[var(--border-color)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Alternar Usuário
                </p>
              </div>
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setCurrentUser(user);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--border-color)]/50 text-left transition"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: roleColors[user.role] }}
                    >
                      {user.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[var(--text-main)] leading-tight truncate">{user.name}</p>
                    <p className="text-[10px]" style={{ color: roleColors[user.role] }}>
                      {roleLabels[user.role]}
                    </p>
                  </div>
                  {currentUser?.id === user.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outside click listener */}
      {(showDropdown || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowDropdown(false); setShowNotifications(false); }}
        />
      )}
      </div>
    </header>
  );
};
