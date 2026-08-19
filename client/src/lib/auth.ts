import { http } from './http';
import { session } from './session';
import type { User } from '../types';

/**
 * Cliente das rotas de autenticação do servidor.
 *
 * O login/cadastro e a validação de senha acontecem no servidor. Aqui só
 * guardamos o token devolvido e o enviamos nas próximas requisições.
 */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  /** Autentica e guarda o token da sessão. Devolve o usuário (sem senha). */
  async login(email: string, password: string): Promise<User> {
    const { token, user } = await http.post<LoginResponse>('/auth/login', { email, password });
    session.set(token);
    return user;
  },

  /** Cria uma conta. Não autentica automaticamente (passa pela tela de login). */
  async register(input: RegisterInput): Promise<User> {
    return http.post<User>('/auth/register', input);
  },

  /** Usuário da sessão atual usado para restaurar o login ao recarregar. */
  async me(): Promise<User> {
    return http.get<User>('/auth/me');
  },

  /** Encerra a sessão no servidor e limpa o token local. */
  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch {
      // Logout é best-effort: o token local é limpo de qualquer maneira.
    }
    session.clear();
  }
};
