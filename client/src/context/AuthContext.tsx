import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db/db';
import { useLiveQuery } from '../data/useLiveQuery';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  hasPermission: (module: string) => boolean;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Consulta reativa: se a lista mudar (cadastro, exclusão, restauração de
  // backup), o seletor de usuário acompanha. Antes era carregada uma única vez.
  const usersQuery = useLiveQuery(() => db.users.toArray(), []);
  const allUsers = useMemo(() => usersQuery ?? [], [usersQuery]);

  // Escolhe o primeiro usuário no boot e realinha se o usuário atual sair da lista.
  useEffect(() => {
    if (allUsers.length === 0) return;

    setCurrentUser((current) => {
      if (!current) return allUsers[0];
      const stillExists = allUsers.find((u) => u.id === current.id);
      return stillExists ?? allUsers[0];
    });
  }, [allUsers]);

  const switchRole = (role: UserRole) => {
    const found = allUsers.find((u) => u.role === role);
    if (found) {
      setCurrentUser(found);
    } else if (currentUser) {
      setCurrentUser({
        ...currentUser,
        role,
        name: `Usuário (${role.toUpperCase()})`
      });
    }
  };

  const hasPermission = (module: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    // Administrador tem acesso total
    if (role === 'admin') return true;

    // Vendedor: vendas, clientes, produtos, estoque (view), dashboard
    if (role === 'seller') {
      return ['dashboard', 'customers', 'products', 'sales', 'reports'].includes(module);
    }

    // Técnico: OS, clientes, serviços, estoque (view), dashboard
    if (role === 'technician') {
      return ['dashboard', 'customers', 'os', 'services', 'products', 'reports'].includes(module);
    }

    // Financeiro: contas a pagar, contas a receber, fluxo de caixa, clientes, relatórios, dashboard
    if (role === 'financial') {
      return ['dashboard', 'customers', 'financial', 'reports'].includes(module);
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        allUsers,
        hasPermission,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
