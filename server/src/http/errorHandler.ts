import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError } from './errors.js';

/** 404 para qualquer rota não registrada sob /api. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Handler central de erros. Converte AppError no status correspondente e
 * qualquer outra exceção em 500, sem vazar stack trace para o client.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.name,
      message: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'InvalidJson',
      message: 'O corpo da requisição não é um JSON válido.'
    });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error('[arka-api] erro não tratado:', error);

  res.status(500).json({
    error: 'InternalServerError',
    message: 'Erro interno no servidor.',
    details: process.env.NODE_ENV === 'production' ? undefined : message
  });
};
