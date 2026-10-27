import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({ error: `Route ${request.method} ${request.originalUrl} not found.` });
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  // O parser rejeita corpos acima do limite antes de a requisição chegar ao controller.
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body exceeds the 100 KB limit.' });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Invalid JSON payload.' });
    return;
  }

  // Mantém os detalhes do erro no servidor e evita expor informações internas na resposta.
  console.error(error);
  response.status(500).json({ error: 'Internal server error.' });
}
