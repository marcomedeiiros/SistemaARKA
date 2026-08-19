/**
 * Guarda o token de sessão emitido pelo servidor no login.
 *
 * O token vai no cabeçalho `Authorization: Bearer <token>` de cada requisição
 * (ver lib/http.ts). É a única credencial que o cliente mantém a autorização
 * de fato acontece no servidor, que valida o token contra o banco.
 */
const TOKEN_KEY = 'arka_session_token';

export const session = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignora ambientes sem localStorage (ex.: modo privado restrito).
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nada a fazer.
    }
  }
};
