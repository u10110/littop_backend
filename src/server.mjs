import 'dotenv/config';

import { startStandaloneServer } from '@apollo/server/standalone';

import { createApolloServer, buildContext } from './createServer.mjs';
import { createPool } from './db.mjs';
import { createPostgresRepository } from './postgresRepository.mjs';

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = createPool(DATABASE_URL);
const repo = createPostgresRepository(pool);
const server = createApolloServer({ repo, jwtSecret: JWT_SECRET });

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => buildContext({ req }, { repo, jwtSecret: JWT_SECRET }),
});

console.log(`Littop GraphQL API ready at ${url}`);
