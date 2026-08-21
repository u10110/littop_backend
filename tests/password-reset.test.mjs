import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { hashPassword, issueToken, verifyPassword } from '../src/auth.mjs';

function makeRepo() {
  const user = {
    id: 1,
    email: 'writer@example.com',
    login: 'writer',
    passwordHash: '',
    role: 'author',
    status: 'active',
    registeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: { displayName: 'Writer' },
  };
  const tokens = new Map();

  return {
    user,
    tokens,
    async ping() { return true; },
    async findUserByEmail(email) {
      return user.email === email ? user : null;
    },
    async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
      tokens.clear();
      tokens.set(tokenHash, { userId, expiresAt, usedAt: null });
    },
    async consumePasswordResetToken({ tokenHash }) {
      const token = tokens.get(tokenHash);
      if (!token || token.usedAt || new Date(token.expiresAt) <= new Date()) return null;
      token.usedAt = new Date().toISOString();
      return { userId: token.userId };
    },
    async updateUserPassword({ userId, passwordHash }) {
      assert.equal(String(userId), String(user.id));
      user.passwordHash = passwordHash;
      return user;
    },
    async getUserById(id) {
      return String(id) === String(user.id) ? user : null;
    },
  };
}

async function execute(server, query, variables, repo, mailer) {
  return server.executeOperation(
    { query, variables },
    { contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '', mailer } },
  );
}

test('password reset sends a one-time link for an existing user without exposing the account', async () => {
  const repo = makeRepo();
  repo.user.passwordHash = await hashPassword('old-password');
  const deliveries = [];
  const mailer = { async sendPasswordReset(message) { deliveries.push(message); } };
  const server = createApolloServer({ repo, jwtSecret: 'test-secret', mailer, frontendBaseUrl: 'https://pre-prod.littop.ru' });
  await server.start();

  const result = await execute(server, `mutation($email: String!) { requestPasswordReset(email: $email) }`, { email: repo.user.email }, repo, mailer);

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.requestPasswordReset, true);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].email, repo.user.email);
  assert.match(deliveries[0].resetUrl, /^https:\/\/pre-prod\.littop\.ru\/\?auth=reset&token=/);
  assert.equal(repo.tokens.size, 1);
  await server.stop();
});

test('password reset accepts a valid one-time token, signs the user in, and invalidates the old password', async () => {
  const repo = makeRepo();
  repo.user.passwordHash = await hashPassword('old-password');
  let delivery;
  const mailer = { async sendPasswordReset(message) { delivery = message; } };
  const server = createApolloServer({ repo, jwtSecret: 'test-secret', mailer, frontendBaseUrl: 'https://pre-prod.littop.ru' });
  await server.start();

  await execute(server, `mutation($email: String!) { requestPasswordReset(email: $email) }`, { email: repo.user.email }, repo, mailer);
  const token = new URL(delivery.resetUrl).searchParams.get('token');
  const result = await execute(server, `mutation($token: String!, $password: String!) { resetPassword(token: $token, password: $password) { token user { id email } } }`, { token, password: 'new-password' }, repo, mailer);

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.resetPassword.user.email, repo.user.email);
  assert.ok(result.body.singleResult.data.resetPassword.token);
  assert.equal(await verifyPassword('old-password', repo.user.passwordHash), false);
  assert.equal(await verifyPassword('new-password', repo.user.passwordHash), true);

  const repeated = await execute(server, `mutation($token: String!, $password: String!) { resetPassword(token: $token, password: $password) { token } }`, { token, password: 'another-password' }, repo, mailer);
  assert.equal(repeated.body.kind, 'single');
  assert.equal(repeated.body.singleResult.data, null);
  assert.equal(repeated.body.singleResult.errors[0].extensions.code, 'BAD_USER_INPUT');
  await server.stop();
});

test('password reset request returns success for an unknown email without sending mail', async () => {
  const repo = makeRepo();
  const deliveries = [];
  const mailer = { async sendPasswordReset(message) { deliveries.push(message); } };
  const server = createApolloServer({ repo, jwtSecret: 'test-secret', mailer, frontendBaseUrl: 'https://pre-prod.littop.ru' });
  await server.start();

  const result = await execute(server, `mutation($email: String!) { requestPasswordReset(email: $email) }`, { email: 'unknown@example.com' }, repo, mailer);

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.requestPasswordReset, true);
  assert.equal(deliveries.length, 0);
  await server.stop();
});
