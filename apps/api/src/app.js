import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createAuthRouter } from './auth.js';
import { createDashboardRouter } from './dashboard.js';
import { createTasksRouter } from './tasks.js';
import { createClientsRouter, createClientPortalRouter } from './clients.js';

export function createApp({ webOrigin = 'http://localhost:5173', database, secureCookies = false } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use('/api/v1', (request, response, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.get('origin');
      if (origin && origin !== webOrigin) return response.status(403).json({ error: { code: 'INVALID_ORIGIN', message: 'Request origin is not allowed.' } });
    }
    return next();
  });

  app.get('/api/v1/health', async (_request, response) => {
    try {
      await database.command({ ping: 1 });
      response.json({ data: { status: 'ok', service: 'workgraph-api', database: 'connected' } });
    } catch {
      response.status(503).json({ data: { status: 'unavailable', service: 'workgraph-api', database: 'disconnected' } });
    }
  });

  app.use('/api/v1', createAuthRouter({ database, secureCookies }));
  app.use('/api/v1/dashboard', createDashboardRouter({ database }));
  app.use('/api/v1/tasks', createTasksRouter({ database }));
  app.use('/api/v1/clients', createClientsRouter({ database }));
  app.use('/api/v1/client/portal', createClientPortalRouter({ database }));

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });

  return app;
}
