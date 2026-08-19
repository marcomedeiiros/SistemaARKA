import { Router } from 'express';

import { repositories } from '../database/repositories.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../http/errors.js';
import { readBearer, requireAuth } from '../http/auth.js';
import { requireObject } from '../http/params.js';
import { clearLoginAttempts, loginRateLimit } from '../http/rateLimit.js';
import {
  createSession,
  destroySession,
  findUserByEmail,
  hashPassword,
  isHashed,
  toPublicUser,
  verifyPassword
} from '../services/auth.js';
import type { UserRole } from '../types.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_AVATAR = '/user.webp';

/**
 * Login. A senha é conferida no servidor e, em caso de sucesso, uma sessão é
 * aberta e o token é devolvido. O cliente nunca recebe o hash da senha.
 */
authRouter.post('/login', loginRateLimit, (req, res) => {
  const body = requireObject(req.body);
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');

  if (!email || !password) {
    throw new ValidationError('Informe e-mail e senha.');
  }

  const user = findUserByEmail(email);
  if (!user || user.id === undefined) {
    throw new UnauthorizedError('E-mail não encontrado. Verifique os dados ou crie uma conta.');
  }
  if (user.active === false) {
    throw new UnauthorizedError('Esta conta está inativa. Fale com o administrador.');
  }

  if (!user.password) {
    // Conta de demonstração ainda sem senha: o primeiro acesso a define.
    repositories.users.update(user.id, { password: hashPassword(password) });
  } else if (!verifyPassword(password, user.password)) {
    throw new UnauthorizedError('Senha incorreta.');
  } else if (!isHashed(user.password)) {
    // Conta legada com senha em texto puro: migra para hash de forma silenciosa.
    repositories.users.update(user.id, { password: hashPassword(password) });
  }

  // Login bem-sucedido: zera o contador de tentativas deste IP/e-mail.
  clearLoginAttempts(req.ip ?? 'unknown', email);

  const token = createSession(user.id);
  res.json({ token, user: toPublicUser(user) });
});

/**
 * Cadastro público. O primeiro usuário do sistema nasce como administrador
 * (bootstrap); os demais entram como técnicos, sem escalar o próprio perfil.
 * Não autentica automaticamente o usuário passa pela tela de login.
 */
authRouter.post('/register', (req, res) => {
  const body = requireObject(req.body);
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');

  if (!name) throw new ValidationError('Informe seu nome.');
  if (!EMAIL_RE.test(email)) throw new ValidationError('Informe um e-mail válido.');
  if (password.length < 4) throw new ValidationError('A senha deve ter ao menos 4 caracteres.');

  if (findUserByEmail(email)) {
    throw new ConflictError('Já existe uma conta com esse e-mail.');
  }

  const role: UserRole = repositories.users.count() === 0 ? 'admin' : 'technician';

  const created = repositories.users.insert({
    name,
    email,
    password: hashPassword(password),
    role,
    active: true,
    avatarUrl: USER_AVATAR,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(toPublicUser(created));
});

/** Encerra a sessão atual. */
authRouter.post('/logout', requireAuth, (req, res) => {
  const token = readBearer(req.headers.authorization);
  if (token) destroySession(token);
  res.json({ ok: true });
});

/** Dados do usuário autenticado usado pelo cliente para restaurar a sessão. */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json(toPublicUser(req.user!));
});
