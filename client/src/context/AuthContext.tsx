import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '../types';
import { db } from '../db/db';
import { store } from '../data/store';
import { useLiveQuery } from '../data/useLiveQuery';
import { authApi, RegisterInput } from '../lib/auth';
import { session } from '../lib/session';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  /** `false` enquanto a sessão salva ainda está sendo validada no servidor. */
  authReady: boolean;
  hasPermission: (module: string) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  /** Inicia a saída: liga a tela de transição (a sessão só encerra no fim dela). */
  logout: () => void;
  /** Efetiva a saída ao fim da transição (encerra a sessão e limpa tudo). */
  finishLogout: () => void;
  /** `true` enquanto a tela de transição de saída está sendo exibida. */
  isLeaving: boolean;
  isEnteringDashboard: boolean;
  setIsEnteringDashboard: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isEnteringDashboard, setIsEnteringDashboard] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Lista de usuários (para a tela de Usuários e o cabeçalho). Só é preenchida
  // depois do login, quando o snapshot é carregado do servidor e nunca traz
  // o campo de senha, que o servidor remove antes de enviar.
  const usersQuery = useLiveQuery(
    () => (currentUser ? db.users.toArray() : Promise.resolve([])),
    [currentUser]
  );
  const allUsers = useMemo(() => usersQuery ?? [], [usersQuery]);

  // Restaura a sessão a partir do token salvo, validando-o no servidor.
  useEffect(() => {
    let active = true;
    const token = session.get();

    if (!token) {
      setAuthReady(true);
      return;
    }

    authApi
      .me()
      .then((user) => {
        if (active) setUser(user);
      })
      .catch(() => {
        if (active) {
          session.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Sessão derrubada pelo servidor (token expirado/invalidado) em qualquer
  // requisição: força o logout local.
  useEffect(() => {
    const onExpired = () => {
      // Expiração é abrupta (sem tela de transição): volta direto ao login.
      setIsLeaving(false);
      setUser(null);
      store.reset();
    };
    window.addEventListener('arka-auth-expired', onExpired);
    return () => window.removeEventListener('arka-auth-expired', onExpired);
  }, []);

  /** Entra com e-mail e senha. A validação acontece no servidor. */
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const user = await authApi.login(email, password);
    // Garante que os dados desta sessão sejam buscados do zero com o novo token.
    store.reset();
    setIsEnteringDashboard(true);
    setUser(user);
    return user;
  }, []);

  /** Cria uma conta nova. NÃO autentica automaticamente (deve passar pelo login). */
  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    return authApi.register(input);
  }, []);

  /**
   * Inicia a saída: liga a tela de transição, mas mantém o usuário logado até
   * ela terminar (espelha a tela de entrada, agora ao contrário).
   */
  const logout = useCallback(() => {
    setIsLeaving(true);
  }, []);

  /** Efetiva a saída ao fim da transição: encerra a sessão e limpa tudo. */
  const finishLogout = useCallback(() => {
    void authApi.logout();
    store.reset();
    setUser(null);
    setIsLeaving(false);
  }, []);

  // Gate apenas de interface: esconde botões/menus. A barreira real é o
  // servidor, que revalida cada operação pelo perfil do token.
  const hasPermission = (module: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    if (role === 'admin') return true;

    if (role === 'technician') {
      return ['dashboard', 'customers', 'os', 'sales', 'services', 'products', 'reports'].includes(
        module
      );
    }

    if (role === 'financial') {
      return ['dashboard', 'customers', 'financial', 'reports'].includes(module);
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        authReady,
        hasPermission,
        login,
        register,
        logout,
        finishLogout,
        isLeaving,
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
