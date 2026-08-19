/**
 * Testes de segurança (TDD) do Sistemas Arka.
 *
 * Cada bloco sonda uma das 5 falhas comuns em apps gerados por IA:
 *  1. Banco exposto sem controle de acesso (autenticação obrigatória)
 *  2. Autorização decidida no front (perfil sempre do token no servidor)
 *  3. IDOR / escalada de privilégio por ID
 *  4. Segredos expostos (senha nunca vaza; fica como hash)
 *  5. Input sem validação / dados sensíveis alcançáveis
 *
 * Roda com o test runner nativo do Node contra um banco SQLite temporário e
 * isolado. Sem dependências externas.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// O env precisa estar definido ANTES de importar qualquer módulo que leia a
// config (feito via import dinâmico no before). Não há import estático do app.
const DB_FILE = path.join(tmpdir(), `arka-sec-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_FILE = DB_FILE;
process.env.SEED_ON_EMPTY = 'true';
process.env.NODE_ENV = 'test';

let base = '';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any;
let closeDb: () => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getDb: () => any;

const tokens: Record<string, string> = {};
const iso = '2026-01-01T00:00:00.000Z';

interface Res {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

async function req(
  method: string,
  p: string,
  opts: { token?: string; body?: unknown } = {}
): Promise<Res> {
  const res = await fetch(base + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {})
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  const txt = await res.text();
  let data: unknown;
  try {
    data = txt ? JSON.parse(txt) : undefined;
  } catch {
    data = txt;
  }
  return { status: res.status, data };
}

async function login(email: string, password: string): Promise<string> {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  return (r.data?.token as string) ?? '';
}

before(async () => {
  const { createApp } = await import('../app.js');
  const { seedDatabase } = await import('../database/seed.js');
  const conn = await import('../database/connection.js');
  getDb = conn.getDatabase;
  closeDb = conn.closeDatabase;

  seedDatabase();

  const appInstance = createApp();
  server = appInstance.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;

  // Contas de demonstração definem a senha no primeiro acesso.
  tokens.admin = await login('admin@arka.com.br', 'adminpass');
  tokens.tech = await login('vendas@arka.com.br', 'techpass');
  tokens.fin = await login('financeiro@arka.com.br', 'finpass');

  assert.ok(tokens.admin && tokens.tech && tokens.fin, 'tokens de login obtidos');
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(DB_FILE + suffix);
    } catch {
      // arquivo pode não existir
    }
  }
});

/* ───────── 1. Autenticação obrigatória (banco não fica exposto) ───────── */

test('1.1 snapshot sem token → 401', async () => {
  assert.equal((await req('GET', '/snapshot')).status, 401);
});

test('1.2 listar coleção sem token → 401', async () => {
  assert.equal((await req('GET', '/products')).status, 401);
});

test('1.3 criar registro sem token → 401', async () => {
  assert.equal((await req('POST', '/products', { body: { name: 'x' } })).status, 401);
});

test('1.4 buscar por id sem token → 401', async () => {
  assert.equal((await req('GET', '/customers/1')).status, 401);
});

test('1.5 token inválido → 401', async () => {
  assert.equal((await req('GET', '/snapshot', { token: 'tokenfalso' })).status, 401);
});

/* ───────── 2. Segredos: a senha nunca vaza e fica como hash ───────── */

test('2.1 snapshot não traz o campo password', async () => {
  const r = await req('GET', '/snapshot', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.ok(r.data.users.length > 0);
  assert.ok(!r.data.users.some((u: { password?: unknown }) => u.password !== undefined));
});

test('2.2 GET /users não traz password', async () => {
  const r = await req('GET', '/users', { token: tokens.admin });
  assert.ok(!r.data.some((u: { password?: unknown }) => u.password !== undefined));
});

test('2.3 GET /users/:id não traz password', async () => {
  const r = await req('GET', '/users/1', { token: tokens.admin });
  assert.equal(r.data.password, undefined);
});

test('2.4 resposta do login não traz password', async () => {
  const r = await req('POST', '/auth/login', {
    body: { email: 'admin@arka.com.br', password: 'adminpass' }
  });
  assert.equal(r.data.user.password, undefined);
});

test('2.5 a senha é guardada como hash scrypt (nunca texto puro)', async () => {
  const row = getDb()
    .prepare('SELECT password FROM users WHERE email = ?')
    .get('admin@arka.com.br') as { password: string };
  assert.ok(row.password.startsWith('scrypt$'), 'senha deveria estar em hash scrypt');
  assert.ok(!row.password.includes('adminpass'), 'a senha em texto puro não pode aparecer');
});

test('2.6 sessões não são expostas via CRUD genérico (tokens não enumeráveis)', async () => {
  assert.equal((await req('GET', '/sessions', { token: tokens.admin })).status, 404);
});

/* ───────── 3. Autorização / IDOR / escalada de privilégio ───────── */

test('3.1 técnico NÃO promove ninguém a admin (PATCH /users/:id role)', async () => {
  const r = await req('PATCH', '/users/1', { token: tokens.tech, body: { role: 'admin' } });
  assert.equal(r.status, 403);
});

test('3.2 técnico NÃO cria usuário', async () => {
  const r = await req('POST', '/users', {
    token: tokens.tech,
    body: { name: 'Hacker', email: 'h@x.com', role: 'admin', active: true, createdAt: iso }
  });
  assert.equal(r.status, 403);
});

test('3.3 técnico NÃO exclui usuário', async () => {
  assert.equal((await req('DELETE', '/users/2', { token: tokens.tech })).status, 403);
});

test('3.4 técnico NÃO altera configurações da empresa', async () => {
  const r = await req('PUT', '/companySettings/1', {
    token: tokens.tech,
    body: { name: 'Fake', tradeName: 'x', cnpj: '', phone: '', whatsapp: '', email: '', address: '', city: '', state: '', zipCode: '', allowNegativeStock: true }
  });
  assert.equal(r.status, 403);
});

test('3.5 admin GET /admin/backup → 200; técnico → 403', async () => {
  assert.equal((await req('GET', '/admin/backup', { token: tokens.admin })).status, 200);
  assert.equal((await req('GET', '/admin/backup', { token: tokens.tech })).status, 403);
});

test('3.6 técnico NÃO limpa o banco (POST /admin/clear)', async () => {
  assert.equal((await req('POST', '/admin/clear', { token: tokens.tech })).status, 403);
});

test('3.7 admin PODE mudar perfil de outro usuário (controle legítimo)', async () => {
  const r = await req('PATCH', '/users/3', { token: tokens.admin, body: { role: 'financial' } });
  assert.equal(r.status, 200);
  // devolve o registro atualizado, sem senha
  assert.equal(r.data.role, 'financial');
  assert.equal(r.data.password, undefined);
});

/* Autorização por coleção no CRUD genérico (defesa em profundidade) */

test('3.8 técnico ESCREVE produtos (permitido) → 201', async () => {
  const r = await req('POST', '/products', {
    token: tokens.tech,
    body: { sku: 'TDD-1', name: 'Produto TDD', categoryId: 1, brand: 'x', unit: 'UN', costPrice: 1, salePrice: 2, currentStock: 3, minStock: 0, barcode: '1', active: true, createdAt: iso, updatedAt: iso }
  });
  assert.equal(r.status, 201);
});

test('3.9 financeiro NÃO escreve produtos (fora do seu módulo) → 403', async () => {
  const r = await req('POST', '/products', {
    token: tokens.fin,
    body: { sku: 'TDD-2', name: 'X', categoryId: 1, brand: 'x', unit: 'UN', costPrice: 1, salePrice: 2, currentStock: 1, minStock: 0, barcode: '2', active: true, createdAt: iso, updatedAt: iso }
  });
  assert.equal(r.status, 403);
});

test('3.10 técnico NÃO escreve fornecedores (módulo admin) → 403', async () => {
  const r = await req('POST', '/suppliers', {
    token: tokens.tech,
    body: { name: 'Forn X', createdAt: iso }
  });
  assert.equal(r.status, 403);
});

test('3.11 técnico NÃO escreve direto no razão de contas a pagar → 403', async () => {
  const r = await req('POST', '/accountsPayable', {
    token: tokens.tech,
    body: { supplierName: 'x', description: 'y', category: 'z', amount: 10, paidAmount: 0, dueDate: '2026-01-01', status: 'pendente', createdAt: iso }
  });
  assert.equal(r.status, 403);
});

test('3.12 financeiro E técnico PODEM escrever clientes (módulo compartilhado)', async () => {
  const fin = await req('POST', '/customers', { token: tokens.fin, body: { name: 'Cliente Fin', createdAt: iso, updatedAt: iso } });
  const tech = await req('POST', '/customers', { token: tokens.tech, body: { name: 'Cliente Tech', createdAt: iso, updatedAt: iso } });
  assert.equal(fin.status, 201);
  assert.equal(tech.status, 201);
});

/* Autorização nas operações de negócio (mesma política das coleções)  */

test('3.13 técnico NÃO cria conta a pagar via /operations → 403', async () => {
  const r = await req('POST', '/operations/payables', {
    token: tokens.tech,
    body: { supplierName: 'X', description: 'Y', amount: 10, dueDate: '2026-12-01' }
  });
  assert.equal(r.status, 403);
});

test('3.14 técnico NÃO dá baixa em conta a pagar via /operations → 403', async () => {
  const r = await req('POST', '/operations/payables/2/pay', {
    token: tokens.tech,
    body: { amount: 10, paymentMethod: 'pix' }
  });
  assert.equal(r.status, 403);
});

test('3.15 financeiro NÃO cria venda via /operations → 403', async () => {
  const r = await req('POST', '/operations/sales', { token: tokens.fin, body: {} });
  assert.equal(r.status, 403);
});

test('3.16 técnico NÃO registra movimentação de estoque manual (módulo admin) → 403', async () => {
  const r = await req('POST', '/operations/stock-movements', {
    token: tokens.tech,
    body: { productId: 1, type: 'entrada', quantity: 1, reason: 'teste' }
  });
  assert.equal(r.status, 403);
});

test('3.17 financeiro PODE criar e quitar contas via /operations (positivo)', async () => {
  const create = await req('POST', '/operations/payables', {
    token: tokens.fin,
    body: { supplierName: 'Fornecedor TDD', description: 'Compra TDD', amount: 100, dueDate: '2026-12-01' }
  });
  assert.equal(create.status, 201);

  const pay = await req('POST', `/operations/payables/${create.data.id}/pay`, {
    token: tokens.fin,
    body: { amount: 50, paymentMethod: 'pix' }
  });
  assert.equal(pay.status, 200);
});

test('3.18 técnico ALCANÇA o handler de venda (guarda não bloqueia o perfil certo)', async () => {
  const r = await req('POST', '/operations/sales', { token: tokens.tech, body: {} });
  assert.notEqual(r.status, 401);
  assert.notEqual(r.status, 403);
});

/* ───────── 4. Validação de input ───────── */

test('4.1 e-mail inválido ao criar usuário → 422', async () => {
  const r = await req('POST', '/users', {
    token: tokens.admin,
    body: { name: 'X', email: 'nao-e-email', role: 'technician', active: true, createdAt: iso }
  });
  assert.equal(r.status, 422);
});

test('4.2 perfil inválido ao criar usuário → 422', async () => {
  const r = await req('POST', '/users', {
    token: tokens.admin,
    body: { name: 'X', email: 'v@x.com', role: 'superadmin', active: true, createdAt: iso }
  });
  assert.equal(r.status, 422);
});

test('4.3 preço negativo em produto → 422', async () => {
  const r = await req('POST', '/products', {
    token: tokens.tech,
    body: { sku: 'NEG', name: 'X', categoryId: 1, brand: 'x', unit: 'UN', costPrice: -5, salePrice: 2, currentStock: 1, minStock: 0, barcode: '9', active: true, createdAt: iso, updatedAt: iso }
  });
  assert.equal(r.status, 422);
});

test('4.4 campo obrigatório ausente (name) → 422', async () => {
  const r = await req('POST', '/products', {
    token: tokens.tech,
    body: { sku: 'NONAME', categoryId: 1, brand: 'x', unit: 'UN', costPrice: 1, salePrice: 2, currentStock: 1, minStock: 0, barcode: '9', active: true, createdAt: iso, updatedAt: iso }
  });
  assert.equal(r.status, 422);
});

test('4.5 id inválido na rota → 422', async () => {
  assert.equal((await req('GET', '/products/abc', { token: tokens.admin })).status, 422);
  assert.equal((await req('GET', '/products/-1', { token: tokens.admin })).status, 422);
});

test('4.6 coleção inexistente → 404', async () => {
  assert.equal((await req('GET', '/naoexiste', { token: tokens.admin })).status, 404);
});

test('4.7 leituras continuam abertas a qualquer autenticado (não quebrar o app)', async () => {
  assert.equal((await req('GET', '/accountsPayable', { token: tokens.tech })).status, 200);
  assert.equal((await req('GET', '/products', { token: tokens.fin })).status, 200);
});

/* ───────── 5. Credenciais, sessão e força bruta ───────── */

test('5.1 senha errada → 401', async () => {
  assert.equal(
    (await req('POST', '/auth/login', { body: { email: 'admin@arka.com.br', password: 'errada' } })).status,
    401
  );
});

test('5.2 e-mail inexistente → 401', async () => {
  assert.equal(
    (await req('POST', '/auth/login', { body: { email: 'ninguem@x.com', password: 'x' } })).status,
    401
  );
});

test('5.3 usuário desativado perde acesso na hora (token deixa de valer) e não loga', async () => {
  // Cria e autentica um usuário próprio para o teste.
  const email = `desativar-${Date.now()}@x.com`;
  const created = await req('POST', '/users', {
    token: tokens.admin,
    body: { name: 'Para Desativar', email, password: 'segredo123', role: 'technician', active: true, createdAt: iso }
  });
  assert.equal(created.status, 201);
  const victim = await login(email, 'segredo123');
  assert.ok(victim, 'usuário criado consegue logar');
  assert.equal((await req('GET', '/snapshot', { token: victim })).status, 200);

  // Admin desativa a conta.
  const off = await req('PATCH', `/users/${created.data.id}`, { token: tokens.admin, body: { active: false } });
  assert.equal(off.status, 200);

  // O token existente não vale mais e um novo login é recusado.
  assert.equal((await req('GET', '/snapshot', { token: victim })).status, 401);
  assert.equal(await login(email, 'segredo123'), '');
});

test('5.4 força bruta no login é barrada (rate limit → 429)', async () => {
  let sawTooMany = false;
  let lastStatus = 0;
  for (let i = 0; i < 12; i++) {
    const r = await req('POST', '/auth/login', {
      body: { email: 'brute@x.com', password: `tentativa-${i}` }
    });
    lastStatus = r.status;
    if (r.status === 429) sawTooMany = true;
  }
  assert.ok(sawTooMany, 'deveria retornar 429 após muitas tentativas');
  assert.equal(lastStatus, 429);
});
