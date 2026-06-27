import 'dotenv/config';

import { createApolloServer } from './createServer.mjs';
import { createPool } from './db.mjs';
import { createMailer } from './email.mjs';
import { createHttpServer } from './httpServer.mjs';
import { createPostgresRepository } from './postgresRepository.mjs';

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const ADMIN_USER_IDS = new Set(
  String(process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = createPool(DATABASE_URL);
const repo = createPostgresRepository(pool);
const mailer = createMailer(process.env);
const frontendBaseUrl = String(process.env.FRONTEND_BASE_URL || process.env.PUBLIC_FRONTEND_URL || '').trim();
const apolloServer = createApolloServer({
  repo,
  jwtSecret: JWT_SECRET,
  adminUserIds: ADMIN_USER_IDS,
  mailer,
  frontendBaseUrl,
});
await apolloServer.start();

const httpServer = createHttpServer({
  apolloServer,
  repo,
  jwtSecret: JWT_SECRET,
  adminUserIds: ADMIN_USER_IDS,
  env: process.env,
});

await new Promise((resolve) => httpServer.listen(PORT, '0.0.0.0', resolve));
console.log(`Littop backend ready at http://0.0.0.0:${PORT}`);
