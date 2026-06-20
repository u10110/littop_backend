import 'dotenv/config';

import { createApolloServer } from './createServer.mjs';
import { createPool } from './db.mjs';
import { createHttpServer } from './httpServer.mjs';
import { createPostgresRepository } from './postgresRepository.mjs';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || 'localhost';
const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = createPool(DATABASE_URL);
const repo = createPostgresRepository(pool);
const apolloServer = createApolloServer({ repo, jwtSecret: JWT_SECRET });
await apolloServer.start();

const httpServer = createHttpServer({
  apolloServer,
  repo,
  jwtSecret: JWT_SECRET,
  env: process.env,
});

await new Promise((resolve) => httpServer.listen(PORT, HOST, resolve));
console.log(`Littop backend ready at http://${HOST}:${PORT}`);
