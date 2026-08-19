/**
 * Testes de fumaça de segurança do cliente.
 *
 * Focam no que é sensível à segurança na borda do navegador:
 *  - o token de sessão é anexado como `Authorization: Bearer` em cada requisição;
 *  - sem token, nenhum cabeçalho de autorização é enviado;
 *  - um 401 com token derruba a sessão (limpa o token + evento de expiração);
 *  - um 401 sem token (ex.: senha errada no login) NÃO derruba nada;
 *  - authApi.login guarda o token; authApi.logout sempre limpa o token local.
 *
 * Roda com o runner nativo do Node (via tsx), com `window`/`localStorage`/`fetch`
 * simulados não precisa de navegador nem de dependências pesadas.
 */
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/* ───────── stubs de navegador (antes de importar os módulos) ───────── */

class MemStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

type Handler = (event: Event) => void;
const handlers: Record<string, Handler[]> = {};

const win = {
  localStorage: new MemStorage(),
  addEventListener(type: string, handler: Handler): void {
    (handlers[type] ||= []).push(handler);
  },
  removeEventListener(type: string, handler: Handler): void {
    handlers[type] = (handlers[type] || []).filter((h) => h !== handler);
  },
  dispatchEvent(event: Event): boolean {
    (handlers[event.type] || []).forEach((h) => h(event));
    return true;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = win;

// Mock de fetch: captura a chamada e devolve uma resposta controlada.
interface Captured {
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init?: any;
}
let captured: Captured = {};
let nextResponse: { status: number; body?: string } = { status: 200, body: '' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = async (url: string, init: any) => {
  captured = { url, init };
  return {
    status: nextResponse.status,
    ok: nextResponse.status >= 200 && nextResponse.status < 300,
    text: async () => nextResponse.body ?? ''
  };
};

/* ───────── importa os módulos reais do cliente ───────── */

const { session } = await import('../lib/session');
const { http, ApiError } = await import('../lib/http');
const { authApi } = await import('../lib/auth');

beforeEach(() => {
  session.clear();
  captured = {};
  nextResponse = { status: 200, body: '' };
  for (const key of Object.keys(handlers)) delete handlers[key];
});

/* ───────── token é anexado / omitido corretamente ───────── */

test('anexa Authorization: Bearer <token> quando há sessão', async () => {
  session.set('tok-123');
  nextResponse = { status: 200, body: JSON.stringify({ ok: true }) };

  await http.get('/snapshot');

  assert.equal(captured.init.headers.Authorization, 'Bearer tok-123');
});

test('não envia Authorization quando não há token', async () => {
  nextResponse = { status: 200, body: '{}' };

  await http.get('/snapshot');

  assert.equal(captured.init.headers.Authorization, undefined);
});

test('usa a URL base /api no caminho da requisição', async () => {
  nextResponse = { status: 200, body: '{}' };

  await http.get('/products');

  assert.ok(String(captured.url).endsWith('/api/products'));
});

/* ───────── 401 derruba a sessão (defesa) ───────── */

test('401 COM token: limpa a sessão e dispara arka-auth-expired', async () => {
  session.set('tok-x');
  let fired = false;
  win.addEventListener('arka-auth-expired', () => {
    fired = true;
  });

  nextResponse = { status: 401, body: JSON.stringify({ message: 'expirado' }) };

  await assert.rejects(
    () => http.get('/snapshot'),
    (err) => err instanceof ApiError && err.status === 401
  );

  assert.equal(session.get(), null, 'o token deve ser limpo');
  assert.ok(fired, 'o evento de expiração deve disparar');
});

test('401 SEM token: não limpa nem dispara (não interfere no login)', async () => {
  session.clear();
  let fired = false;
  win.addEventListener('arka-auth-expired', () => {
    fired = true;
  });

  nextResponse = { status: 401, body: JSON.stringify({ message: 'credenciais inválidas' }) };

  await assert.rejects(
    () => http.post('/auth/login', { email: 'a@b.com', password: 'errada' }),
    (err) => err instanceof ApiError && err.status === 401
  );

  assert.equal(fired, false, 'um 401 de login não deve disparar expiração de sessão');
});

/* ───────── ciclo de vida do token no authApi ───────── */

test('authApi.login guarda o token e devolve o usuário (sem senha)', async () => {
  nextResponse = {
    status: 200,
    body: JSON.stringify({ token: 'abc', user: { id: 1, name: 'Admin', role: 'admin' } })
  };

  const user = await authApi.login('admin@arka.com.br', 'senha');

  assert.equal(session.get(), 'abc');
  assert.equal(user.role, 'admin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.equal((user as any).password, undefined);
});

test('authApi.logout limpa o token local mesmo se o servidor falhar', async () => {
  session.set('zzz');
  nextResponse = { status: 500, body: '' }; // logout é best-effort

  await authApi.logout();

  assert.equal(session.get(), null);
});
