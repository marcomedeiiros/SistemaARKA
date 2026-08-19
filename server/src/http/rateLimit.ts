import type { RequestHandler } from 'express';

import { TooManyRequestsError } from './errors.js';

/**
 * Limitador de tentativas de login, em memória, por (IP + e-mail).
 *
 * Barra ataques de força bruta sem depender de serviço externo. Como é em
 * memória e por processo, é uma defesa local em produção com múltiplas
 * instâncias, combine com um limitador na borda (proxy/WAF).
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

function keyFor(ip: string, email: string): string {
  return `${ip}::${email.trim().toLowerCase()}`;
}

/** Middleware: conta cada tentativa e recusa (429) quando passa do limite. */
export const loginRateLimit: RequestHandler = (req, _res, next) => {
  const email = String((req.body as { email?: unknown })?.email ?? '');
  const key = keyFor(req.ip ?? 'unknown', email);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    throw new TooManyRequestsError(
      'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
    );
  }
  next();
};

/** Zera o contador após um login bem-sucedido. */
export function clearLoginAttempts(ip: string, email: string): void {
  attempts.delete(keyFor(ip, email));
}
