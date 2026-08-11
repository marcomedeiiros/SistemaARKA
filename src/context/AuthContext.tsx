import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db/db';

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
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const users = await db.users.toArray();
      setAllUsers(users);
      if (users.length > 0 && !currentUser) {
        setCurrentUser(users[0]); // Default to Admin
      }
    }
    loadUsers();
  }, []);

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
