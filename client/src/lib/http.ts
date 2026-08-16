/**
 * Cliente HTTP da API do Sistemas Arka.
 *
 * Em desenvolvimento o Vite faz proxy de `/api` para o servidor Express
 * (ver vite.config.ts). Em produção, defina VITE_API_URL apontando para a API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

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

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique se a API está em execução.',
      0
    );
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
