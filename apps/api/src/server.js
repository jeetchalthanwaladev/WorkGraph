import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createApp } from './app.js';
import { connectDatabase } from './database.js';
import { seedDevelopmentAccounts } from './seed.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
dotenv.config({ path: resolve(projectRoot, '.env') });

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/'),
  MONGODB_DB_NAME: z.string().min(1).default('workgraph'),
  SEED_ADMIN_LOGIN_ID: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_EMPLOYEE_LOGIN_ID: z.string().optional(),
  SEED_EMPLOYEE_PASSWORD: z.string().optional()
}).safeParse(process.env);

if (!environment.success) {
  console.error('Invalid environment configuration:', environment.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; '));
  process.exit(1);
}

const { API_PORT, WEB_ORIGIN, MONGODB_URI, MONGODB_DB_NAME, NODE_ENV, SEED_ADMIN_LOGIN_ID, SEED_ADMIN_PASSWORD, SEED_EMPLOYEE_LOGIN_ID, SEED_EMPLOYEE_PASSWORD } = environment.data;

try {
  const { client, database } = await connectDatabase({ uri: MONGODB_URI, databaseName: MONGODB_DB_NAME });
  if (NODE_ENV === 'development' && SEED_ADMIN_LOGIN_ID && SEED_ADMIN_PASSWORD && SEED_EMPLOYEE_LOGIN_ID && SEED_EMPLOYEE_PASSWORD) {
    await seedDevelopmentAccounts(database, {
      adminLoginId: SEED_ADMIN_LOGIN_ID,
      adminPassword: SEED_ADMIN_PASSWORD,
      employeeLoginId: SEED_EMPLOYEE_LOGIN_ID,
      employeePassword: SEED_EMPLOYEE_PASSWORD
    });
    console.log('Development admin and employee accounts are ready.');
  }
  const app = createApp({ webOrigin: WEB_ORIGIN, database, secureCookies: NODE_ENV === 'production' });
  const server = app.listen(API_PORT, () => console.log(`WorkGraph API listening on http://localhost:${API_PORT} (database: ${database.databaseName})`));

  const shutdown = async () => {
    server.close();
    await client.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Could not connect to MongoDB at ${MONGODB_URI}: ${error.message}`);
  process.exit(1);
}
