import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { getDatabase } from '../database/connection.js';
import { repositories } from '../database/repositories.js';
import type { User } from '../types.js';

/**
 * Autenticação do servidor.
 *
 * Senhas são guardadas como hash scrypt (nunca em texto puro) e as sessões
 * ficam numa tabela dedicada, com token opaco e prazo de validade. Tudo usa
 * apenas o `node:crypto` embutido não há dependência externa.
 */

const KEY_LENGTH = 64;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

/** Gera o hash de uma senha no formato `scrypt$<salt>$<hash>`. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/** `true` quando o valor guardado já é um hash scrypt (e não senha legada). */
export function isHashed(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('scrypt$');
}

/**
 * Confere a senha contra o valor guardado. Faz comparação em tempo constante
 * para hashes; aceita senhas legadas em texto puro (que o login migra depois).
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!isHashed(stored)) {
    return plain === stored;
  }

  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const derived = scryptSync(plain, salt, KEY_LENGTH);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Copia o usuário sem o campo `password`, para nunca vazá-lo ao cliente. */
export function toPublicUser<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
  const clone: Record<string, unknown> = { ...user };
  delete clone.password;
  return clone as Omit<T, 'password'>;
}

/** Busca um usuário por e-mail, sem diferenciar maiúsculas/minúsculas. */
export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return repositories.users
    .findAll()
    .find((user) => user.email.trim().toLowerCase() === normalized);
}

/* ───────────────────────── Sessões ───────────────────────── */

function ensureSessionTable(): void {
  getDatabase().exec(
    `CREATE TABLE IF NOT EXISTS "sessions" (
      "token" TEXT PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "createdAt" TEXT NOT NULL,
      "expiresAt" TEXT NOT NULL
    );`
  );
}

/** Cria a tabela de sessões. Chamado uma vez na inicialização da API. */
export function initAuth(): void {
  ensureSessionTable();
}

/** Abre uma sessão para o usuário e devolve o token opaco correspondente. */
export function createSession(userId: number): string {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();

  getDatabase()
    .prepare(
      `INSERT INTO "sessions" ("token", "userId", "createdAt", "expiresAt") VALUES (?, ?, ?, ?)`
    )
    .run(
      token,
      userId,
      new Date(now).toISOString(),
      new Date(now + SESSION_TTL_MS).toISOString()
    );

  return token;
}

/**
 * Usuário dono de um token de sessão válido. Devolve `undefined` se o token não
 * existe, expirou, ou se a conta foi removida/desativada. Sempre lê o usuário
 * do banco a autorização nunca depende de dado enviado pelo cliente.
 */
export function userForToken(token: string): User | undefined {
  const row = getDatabase()
    .prepare(`SELECT "userId", "expiresAt" FROM "sessions" WHERE "token" = ?`)
    .get(token) as { userId: number; expiresAt: string } | undefined;

  if (!row) return undefined;

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    destroySession(token);
    return undefined;
  }

  const user = repositories.users.findById(Number(row.userId));
  if (!user || user.active === false) return undefined;
  return user;
}

/** Encerra uma sessão específica (logout). */
export function destroySession(token: string): void {
  getDatabase().prepare(`DELETE FROM "sessions" WHERE "token" = ?`).run(token);
}

/** Encerra todas as sessões de um usuário (ao desativar/excluir a conta). */
export function destroySessionsForUser(userId: number): void {
  getDatabase().prepare(`DELETE FROM "sessions" WHERE "userId" = ?`).run(userId);
}
