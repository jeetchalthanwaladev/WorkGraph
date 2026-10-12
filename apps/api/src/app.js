import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export function createApp({ webOrigin = 'http://localhost:5173', database } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

  app.get('/api/v1/health', async (_request, response) => {
    try {
      await database.command({ ping: 1 });
      response.json({ data: { status: 'ok', service: 'workgraph-api', database: 'connected' } });
    } catch {
      response.status(503).json({ data: { status: 'unavailable', service: 'workgraph-api', database: 'disconnected' } });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });

  return app;
}
