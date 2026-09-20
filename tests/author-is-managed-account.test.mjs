import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';

// Публичный флаг isManagedAccount на Author:
// - классик → true
// - есть managed-author запись → true
// - обычный автор → false

function makeAuthor(overrides = {}) {
  return {
    id: '51',
    login: 'author_one',
    email: 'one@example.com',
    displayName: 'Автор Один',
    ratingTotal: 10,
    worksCountCached: 2,
    isClassic: false,
    isManagedAccountRef: null,
    ...overrides,
  };
}

function makeRepo({ author, managedAccount }) {
  return {
    async ping() { return true; },
    async getAuthorByLogin(login) { return author && author.login === login ? author : null; },
    async getAuthor() { return author; },
    async getManagedAuthorAccount({ managedUserId }) {
      if (managedAccount && String(managedUserId) === String(author.id)) return managedAccount;
      return null;
    },
    async getAuthorProfileLinks() { return []; },
    async canReceivePrivateMessages() { return true; },
  };
}

async function queryIsManagedAccount(repo) {
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  const res = await server.executeOperation({
    query: `query($login: String!) { author(login: $login) { id isManagedAccount isClassic } }`,
    variables: { login: 'author_one' },
  }, { contextValue: { currentUser: null, repo, adminUserIds: [], jwtSecret: 'test-secret' } });
  await server.stop();
  assert.equal(res.body.kind, 'single');
  return res.body.singleResult.data.author;
}

test('isManagedAccount: обычный автор → false', async () => {
  const data = await queryIsManagedAccount(makeRepo({ author: makeAuthor(), managedAccount: null }));
  assert.equal(data.isManagedAccount, false);
});

test('isManagedAccount: классик → true', async () => {
  const data = await queryIsManagedAccount(makeRepo({
    author: makeAuthor({ isClassic: true }),
    managedAccount: null,
  }));
  assert.equal(data.isManagedAccount, true);
});

test('isManagedAccount: управляемый аккаунт → true', async () => {
  const data = await queryIsManagedAccount(makeRepo({
    author: makeAuthor({ isClassic: false }),
    managedAccount: { id: 900, managedUserId: 51 },
  }));
  assert.equal(data.isManagedAccount, true);
});
