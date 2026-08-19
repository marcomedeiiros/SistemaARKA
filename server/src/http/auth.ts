import type { RequestHandler } from 'express';

import { userForToken } from '../services/auth.js';
import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { User, UserRole } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuário autenticado, carregado do banco a partir do token de sessão. */
      user?: User;
    }
  }
}

/** Extrai o token do cabeçalho `Authorization: Bearer <token>`. */
export function readBearer(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

/**
 * Exige um token de sessão válido e injeta `req.user` a partir do banco.
 * O perfil e a identidade vêm SEMPRE do token validado nunca do corpo, de
 * query params ou de cabeçalhos controlados pelo cliente.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization);
  if (!token) {
    throw new UnauthorizedError();
  }

  const user = userForToken(token);
  if (!user) {
    throw new UnauthorizedError('Sessão expirada ou inválida. Entre novamente.');
  }

  req.user = user;
  next();
};

/** Exige que o usuário autenticado seja administrador. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Ação restrita a administradores.');
  }
  next();
};

/**
 * Exige que o perfil do usuário esteja entre os informados. O administrador é
 * sempre permitido. Usado para guardar as operações de negócio por módulo.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }
    throw new ForbiddenError('Seu perfil não permite esta operação.');
  };
}
