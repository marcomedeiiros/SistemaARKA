import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, Sun, Moon, ChevronDown, Menu, Search,
  AlertTriangle, ClipboardList, DollarSign, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveModule } from './Sidebar';
import { UserRole } from '../../types';
import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { UserAvatar } from '../common/UserAvatar';

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
  technician: 'Técnico',
  financial: 'Financeiro'
};

const roleColors: Record<UserRole, string> = {
  admin: '#3b82f6',
  technician: '#f59e0b',
  financial: '#a855f7'
};

interface HeaderProps {
  activeModule: ActiveModule;
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onNavigate?: (module: ActiveModule) => void;
}

type OpenMenu = 'none' | 'notifications' | 'user';

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onOpenMobileMenu,
  onOpenSearch,
  onNavigate
}) => {
  const { currentUser, allUsers, setCurrentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [openMenu, setOpenMenu] = useState<OpenMenu>('none');
  const actionsRef = useRef<HTMLDivElement>(null);

  const closeMenus = () => setOpenMenu('none');
  const toggleMenu = (menu: Exclude<OpenMenu, 'none'>) =>
    setOpenMenu((current) => (current === menu ? 'none' : menu));

  // Trocar de módulo fecha qualquer menu aberto.
  useEffect(() => {
    closeMenus();
  }, [activeModule]);

  // ESC fecha; clique fora também. Antes existia só uma camada invisível
  // cobrindo a tela, que fechava no clique mas ignorava o teclado.
  useEffect(() => {
    if (openMenu === 'none') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) closeMenus();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openMenu]);

  const lowStockCount = useLiveQuery(async () => {
    const products = await db.products.toArray();
    return products.filter((p) => p.active && p.currentStock <= p.minStock).length;
  }, []) ?? 0;

  const openOsCount = useLiveQuery(async () => {
    const orders = await db.serviceOrders.toArray();
    return orders.filter((o) => o.status === 'aberta').length;
  }, []) ?? 0;

  const pendingReceivablesCount = useLiveQuery(async () => {
    const receivables = await db.accountsReceivable.toArray();
    return receivables.filter((r) => r.status === 'pendente' || r.status === 'vencido').length;
  }, []) ?? 0;

  const alerts = [
    lowStockCount > 0 && {
      key: 'stock',
      module: 'stock' as ActiveModule,
      icon: <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />,
      title: 'Estoque baixo',
      text: `${lowStockCount} produto(s) no limite ou abaixo do estoque mínimo.`
    },
    openOsCount > 0 && {
      key: 'os',
      module: 'os' as ActiveModule,
      icon: <ClipboardList size={16} className="text-blue-500 shrink-0 mt-0.5" />,
      title: 'Ordens de serviço abertas',
      text: `${openOsCount} OS em aberto aguardando atendimento.`
    },
    pendingReceivablesCount > 0 && {
      key: 'financial',
      module: 'financial' as ActiveModule,
      icon: <DollarSign size={16} className="text-emerald-500 shrink-0 mt-0.5" />,
      title: 'Contas a receber',
      text: `${pendingReceivablesCount} título(s) pendentes ou vencidos.`
    }
  ].filter(Boolean) as {
    key: string;
    module: ActiveModule;
    icon: React.ReactNode;
    title: string;
    text: string;
  }[];

  const goTo = (module: ActiveModule) => {
    closeMenus();
    onNavigate?.(module);
  };

  return (
    <header className="app-header">
      <div className="layout-inner app-header-inner">
        {/* Esquerda: menu mobile + título do módulo */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={onOpenMobileMenu}
              className="icon-btn"
              aria-label="Abrir menu de navegação"
              title="Menu de navegação"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="font-bold text-[var(--text-main)] text-sm sm:text-base leading-tight truncate">
              {moduleLabels[activeModule] || activeModule}
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] capitalize truncate">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>
        </div>

        {/* Direita: ações */}
        <div ref={actionsRef} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-arka-500/50 transition"
            title="Busca rápida (Ctrl+K)"
            aria-label="Abrir busca rápida"
          >
            <Search size={15} />
            <span className="hidden sm:inline">Buscar...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              Ctrl K
            </kbd>
          </button>

          <button
            onClick={toggleTheme}
            className="icon-btn"
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('notifications')}
              className="icon-btn relative"
              title="Notificações"
              aria-label={`Notificações${alerts.length ? `: ${alerts.length} alerta(s)` : ''}`}
              aria-expanded={openMenu === 'notifications'}
              aria-haspopup="menu"
            >
              <Bell size={18} />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[var(--bg-card)]" />
              )}
            </button>

            {openMenu === 'notifications' && (
              <div className="dropdown-panel w-72 sm:w-80" role="menu">
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--border-color)]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Notificações
                  </p>
                  <span className="badge badge-blue">{alerts.length} alerta(s)</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-color)]">
                  {alerts.map((alert) => (
                    <button
                      key={alert.key}
                      onClick={() => goTo(alert.module)}
                      role="menuitem"
                      className="w-full p-3 flex items-start gap-2.5 text-left hover:bg-[var(--bg-subtle)] transition"
                    >
                      {alert.icon}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-main)]">{alert.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{alert.text}</p>
                      </div>
                    </button>
                  ))}

                  {alerts.length === 0 && (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                      Tudo em dia. Nenhuma pendência.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Usuário */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('user')}
              className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-xl hover:bg-[var(--bg-subtle)] transition"
              aria-label="Alternar usuário"
              aria-expanded={openMenu === 'user'}
              aria-haspopup="menu"
            >
              <UserAvatar
                name={currentUser?.name}
                avatarUrl={currentUser?.avatarUrl}
                color={roleColors[currentUser?.role || 'admin']}
                ring
              />

              <div className="text-left hidden sm:block min-w-0">
                <p className="text-xs font-semibold text-[var(--text-main)] leading-tight truncate max-w-[130px]">
                  {currentUser?.name}
                </p>
                <p
                  className="text-[10px] font-medium leading-tight"
                  style={{ color: roleColors[currentUser?.role || 'admin'] }}
                >
                  {roleLabels[currentUser?.role || 'admin']}
                </p>
              </div>
              <ChevronDown size={14} className="text-[var(--text-muted)] hidden sm:block shrink-0" />
            </button>

            {openMenu === 'user' && (
              <div className="dropdown-panel w-60" role="menu">
                <div className="px-3.5 py-2.5 border-b border-[var(--border-color)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Alternar usuário
                  </p>
                </div>

                {allUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCurrentUser(user);
                        closeMenus();
                      }}
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--bg-subtle)] transition"
                    >
                      <UserAvatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        color={roleColors[user.role]}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--text-main)] leading-tight truncate">
                          {user.name}
                        </p>
                        <p className="text-[10px]" style={{ color: roleColors[user.role] }}>
                          {roleLabels[user.role]}
                        </p>
                      </div>

                      {isCurrent && <Check size={14} className="text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
