/**
 * Cliente HTTP da API do Sistemas Arka.
 *
 * Em desenvolvimento o Vite faz proxy de `/api` para o servidor Express
 * (ver vite.config.ts). Em produção, defina VITE_API_URL apontando para a API.
 */

import { session } from './session';

// O `import.meta.env &&` mantém a expressão que o Vite substitui no build e, ao
// mesmo tempo, evita erro fora do Vite (ex.: nos testes com o runner do Node,
// onde `import.meta.env` é indefinido).
const BASE_URL = ((import.meta.env && import.meta.env.VITE_API_URL) || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorPayload {
  message?: string;
  error?: string;
  details?: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  // Anexa o token de sessão, quando houver. A autorização é sempre decidida no
  // servidor a partir deste token o cliente nunca envia perfil/identidade.
  const token = session.get();

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique se a API está em execução.',
      0
    );
  }

  // Token rejeitado (expirado/invalidado): limpa a sessão local e avisa o app,
  // que leva o usuário de volta ao login. Só reage quando um token foi enviado,
  // para não interferir num login com credenciais erradas.
  if (response.status === 401 && token) {
    session.clear();
    window.dispatchEvent(new Event('arka-auth-expired'));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  let payload: unknown;

  try {
    payload = raw ? JSON.parse(raw) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as ErrorPayload;
    throw new ApiError(
      body.message ?? `A requisição falhou (HTTP ${response.status}).`,
      response.status,
      body.details
    );
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};
