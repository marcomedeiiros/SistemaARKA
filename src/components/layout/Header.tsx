import React, { useState } from 'react';
import { Bell, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveModule } from './Sidebar';
import { UserRole } from '../../types';

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Clientes',
  os: 'Ordens de Serviço',
  sales: 'Vendas / PDV',
  products: 'Produtos',
  services: 'Serviços',
  stock: 'Controle de Estoque',
  financial: 'Financeiro',
  suppliers: 'Fornecedores',
  reports: 'Relatórios',
  users: 'Usuários & Permissões',
  settings: 'Configurações'
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
}

export const Header: React.FC<HeaderProps> = ({ activeModule }) => {
  const { currentUser, allUsers, setCurrentUser, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const roles: UserRole[] = ['admin', 'seller', 'technician', 'financial'];

  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b sticky top-0 z-20"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        minHeight: '60px'
      }}
    >
      {/* Left: Breadcrumb */}
      <div>
        <h1 className="font-semibold text-[var(--text-main)] text-base">
          {moduleLabels[activeModule] || activeModule}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications placeholder */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--border-color)] transition"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-2"
                style={{ ringColor: roleColors[currentUser.role] }}
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
              <p className="text-xs font-semibold text-[var(--text-main)] leading-tight truncate max-w-[130px]">
                {currentUser?.name}
              </p>
              <p
                className="text-[11px] font-medium leading-tight"
                style={{ color: roleColors[currentUser?.role || 'admin'] }}
              >
                {roleLabels[currentUser?.role || 'admin']}
              </p>
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-2xl overflow-hidden z-50"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Trocar Usuário / Perfil
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
                    <p className="text-[11px]" style={{ color: roleColors[user.role] }}>
                      {roleLabels[user.role]}
                    </p>
                  </div>
                  {currentUser?.id === user.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}
    </header>
  );
};
