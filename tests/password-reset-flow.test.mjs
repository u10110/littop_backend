import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { hashPassword, verifyPassword } from '../src/auth.mjs';

function makeFakeRepo() {
  let userId = 1;
  const users = [];

  function buildLoginCandidate(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/@.*$/, '')
      .replace(/[^a-z0-9а-яё_-]+/giu, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || 'author';
  }

  return {
    async ping() {
      return true;
    },
    async createUser({ email, login, passwordHash, displayName }) {
      const user = {
        id: userId++,
        email,
        login: buildLoginCandidate(login || email),
        passwordHash,
        role: 'author',
        status: 'active',
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          displayName,
          bio: null,
          city: null,
          websiteUrl: null,
          ratingTotal: 0,
          worksCountCached: 0,
          isClassic: false,
          isFeatured: false,
        },
      };
      users.push(user);
      return user;
    },
    async getUserById(id) {
      return users.find((user) => String(user.id) === String(id)) ?? null;
    },
    async getUserByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async getUserByIdentifier(identifier) {
      return users.find((user) => user.email === identifier || user.login === identifier) ?? null;
    },
    async updateUserPassword({ userId, passwordHash }) {
      const user = users.find((item) => String(item.id) === String(userId));
      if (!user) return null;
      user.passwordHash = passwordHash;
      user.updatedAt = new Date().toISOString();
      return user;
    },
    async findUserByEmailOrLogin(email, login) {
      return users.find((user) => user.email === email || user.login === login) ?? null;
    },
    async listAuthors() { return []; },
    async listOnlineAuthors() { return []; },
    async getAuthor() { return null; },
    async listWorks() { return []; },
    async listAnnouncedWorks() { return []; },
    async getWorkById() { return null; },
    async getWorkBySlug() { return null; },
    async listWorkComments() { return []; },
    async listWorkViewers() { return []; },
    async listWorkReaders() { return { totalViews: 0, lockedViews: 0, batchSize: 200, viewers: [] }; },
    async listAuthorPageVisitorsByWork() { return { totalViews: 0, lockedViews: 0, batchSize: 200, visitors: [] }; },
    async listWorkLikers() { return []; },
    async listWorkCommentLikers() { return []; },
    async listWrittenWorkComments() { return []; },
    async listReceivedWorkComments() { return []; },
    async listForumSections() { return []; },
    async listForumTopics() { return []; },
    async getForumTopic() { return null; },
    async listContests() { return []; },
    async listRadioTracks() { return []; },
  };
}

test('password reset flow sends email link and allows setting a new password', async () => {
  const repo = makeFakeRepo();
  const passwordHash = await hashPassword('old-password-123');
  await repo.createUser({
    email: 'reset@example.com',
    passwordHash,
    displayName: 'Reset User',
  });

  const sentEmails = [];
  const server = createApolloServer({
    repo,
    jwtSecret: 'test-secret',
    frontendBaseUrl: 'https://frontend.example.com',
    mailer: {
      enabled: true,
      async sendPasswordResetEmail(payload) {
        sentEmails.push(payload);
      },
    },
  });
  await server.start();

  const requestResult = await server.executeOperation({
    query: `mutation RequestPasswordReset($email: String!) {
      requestPasswordReset(email: $email)
    }`,
    variables: {
      email: 'reset@example.com',
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' },
  });

  assert.equal(requestResult.body.kind, 'single');
  assert.equal(requestResult.body.singleResult.data.requestPasswordReset, true);
  assert.equal(sentEmails.length, 1);
  const resetUrl = new URL(sentEmails[0].resetUrl);
  assert.equal(resetUrl.origin, 'https://frontend.example.com');
  assert.equal(resetUrl.searchParams.get('auth'), 'reset');
  const token = resetUrl.searchParams.get('token');
  assert.ok(token);

  const resetResult = await server.executeOperation({
    query: `mutation ResetPassword($token: String!, $password: String!) {
      resetPassword(token: $token, password: $password) {
        token
        user { id email }
      }
    }`,
    variables: {
      token,
      password: 'new-password-456',
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' },
  });

  assert.equal(resetResult.body.kind, 'single');
  assert.equal(resetResult.body.singleResult.data.resetPassword.user.email, 'reset@example.com');
  assert.ok(resetResult.body.singleResult.data.resetPassword.token);

  const updatedUser = await repo.getUserByEmail('reset@example.com');
  assert.equal(await verifyPassword('new-password-456', updatedUser.passwordHash), true);
  assert.equal(await verifyPassword('old-password-123', updatedUser.passwordHash), false);

  const secondResetResult = await server.executeOperation({
    query: `mutation ResetPassword($token: String!, $password: String!) {
      resetPassword(token: $token, password: $password) {
        token
      }
    }`,
    variables: {
      token,
      password: 'another-password-789',
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' },
  });

  assert.equal(secondResetResult.body.kind, 'single');
  assert.match(secondResetResult.body.singleResult.errors?.[0]?.message || '', /invalid|expired|недействител/i);

  await server.stop();
});
