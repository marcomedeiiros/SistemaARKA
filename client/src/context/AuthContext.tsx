import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db/db';
import { useLiveQuery } from '../data/useLiveQuery';
import { USER_AVATAR_URL } from '../lib/brand';

/** Chave da sessão salva no navegador (mantém o login após recarregar). */
const SESSION_KEY = 'arka_session_user_id';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  hasPermission: (module: string) => boolean;
  switchRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  isEnteringDashboard: boolean;
  setIsEnteringDashboard: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setUser] = useState<User | null>(null);
  const [isEnteringDashboard, setIsEnteringDashboard] = useState(false);

  // Consulta reativa: se a lista mudar (cadastro, exclusão, restauração de
  // backup), a autenticação acompanha.
  const usersQuery = useLiveQuery(() => db.users.toArray(), []);
  const allUsers = useMemo(() => usersQuery ?? [], [usersQuery]);

  /** Define o usuário atual e sincroniza a sessão salva no navegador. */
  const persist = useCallback((user: User | null) => {
    if (user?.id) {
      window.localStorage.setItem(SESSION_KEY, String(user.id));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setUser(user);
  }, []);

  // Restaura a sessão salva no boot (sem login automático) e realinha se o
  // usuário atual sair da lista (ex.: exclusão ou restauração de backup).
  useEffect(() => {
    if (allUsers.length === 0) return;

    setUser((current) => {
      if (current) {
        return allUsers.find((u) => u.id === current.id) ?? null;
      }
      const savedId = Number(window.localStorage.getItem(SESSION_KEY));
      if (savedId) {
        return allUsers.find((u) => u.id === savedId) ?? null;
      }
      return null;
    });
  }, [allUsers]);

  const setCurrentUser = useCallback((user: User) => persist(user), [persist]);

  /** Entra com e-mail e senha. Contas antigas sem senha a definem no 1º acesso. */
  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const normalized = email.trim().toLowerCase();
      const users = await db.users.toArray();
      const user = users.find((u) => u.email.trim().toLowerCase() === normalized);

      if (!user) throw new Error('E-mail não encontrado. Verifique os dados ou crie uma conta.');
      if (user.active === false) throw new Error('Esta conta está inativa. Fale com o administrador.');

      // Contas de demonstração ainda não têm senha: o primeiro acesso a define.
      if (!user.password) {
        await db.users.update(user.id!, { password });
        const claimed = { ...user, password };
        setIsEnteringDashboard(true);
        persist(claimed);
        return claimed;
      }

      if (user.password !== password) throw new Error('Senha incorreta.');

      setIsEnteringDashboard(true);
      persist(user);
      return user;
    },
    [persist]
  );

  /** Cria uma conta nova. O usuário NÃO é autenticado automaticamente (deve passar pelo login). */
  const register = useCallback(
    async ({ name, email, password }: RegisterInput): Promise<User> => {
      const cleanName = name.trim();
      const cleanEmail = email.trim();
      const normalized = cleanEmail.toLowerCase();

      const users = await db.users.toArray();
      if (users.some((u) => u.email.trim().toLowerCase() === normalized)) {
        throw new Error('Já existe uma conta com esse e-mail.');
      }

      const now = new Date().toISOString();
      const base = {
        name: cleanName,
        email: cleanEmail,
        password,
        role: (users.length === 0 ? 'admin' : 'technician') as UserRole,
        active: true,
        avatarUrl: USER_AVATAR_URL,
        createdAt: now
      };
      const id = await db.users.add(base);
      const created: User = { ...base, id };
      // Não chama persist(created) para exigir a etapa de login
      return created;
    },
    []
  );

  const logout = useCallback(() => persist(null), [persist]);

  const switchRole = (role: UserRole) => {
    const found = allUsers.find((u) => u.role === role);
    if (found) {
      persist(found);
    } else if (currentUser) {
      persist({
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

    // Técnico: OS, vendas, clientes, serviços, estoque (view), dashboard
    if (role === 'technician') {
      return ['dashboard', 'customers', 'os', 'sales', 'services', 'products', 'reports'].includes(
        module
      );
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
        switchRole,
        login,
        register,
        logout,
        isEnteringDashboard,
        setIsEnteringDashboard
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
