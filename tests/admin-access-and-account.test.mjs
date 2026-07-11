import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';

function makeRepo() {
  const calls = [];
  const currentUser = {
    id: 99,
    email: 'admin@example.com',
    login: 'admin',
    role: 'admin',
    status: 'active',
    registeredAt: new Date().toISOString(),
    lastLoginAt: null,
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Админ',
      bio: null,
      avatarUrl: null,
      coverImageUrl: null,
      city: null,
      websiteUrl: null,
      ratingTotal: 0,
      worksCountCached: 0,
      isClassic: false,
      isFeatured: false,
    },
  };

  return {
    calls,
    async ping() { return true; },
    async getUserById(id) {
      return String(id) === '99' ? currentUser : null;
    },
    async touchUserPresence() { return currentUser; },
    async updateWork(args) {
      calls.push({ kind: 'updateWork', args });
      return { id: 101, title: 'Чужой текст', status: 'published', sectionCode: 'poetry', ratingsCount: 0, averageRating: 0, commentsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorUserId: 1 };
    },
    async softDeleteWork(args) {
      calls.push({ kind: 'softDeleteWork', args });
      return { id: 101, title: 'Чужой текст', status: 'archived', sectionCode: 'poetry', ratingsCount: 0, averageRating: 0, commentsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorUserId: 1 };
    },
    async updateForumTopic(args) {
      calls.push({ kind: 'updateForumTopic', args });
      return { id: 77, title: 'Чужая тема', status: 'open', sectionSlug: 'tm', repliesCount: 0, viewsCount: 0, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorUserId: 1 };
    },
    async softDeleteForumTopic(args) {
      calls.push({ kind: 'softDeleteForumTopic', args });
      return { id: 77, title: 'Чужая тема', status: 'archived', sectionSlug: 'tm', repliesCount: 0, viewsCount: 0, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorUserId: 1 };
    },
    async updateForumPost(args) {
      calls.push({ kind: 'updateForumPost', args });
      return { id: 501, topicId: 77, userId: 1, parentPostId: null, body: 'Исправлено', imageUrl: null, status: 'visible', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },
    async softDeleteForumPost(args) {
      calls.push({ kind: 'softDeleteForumPost', args });
      return { id: 501, topicId: 77, userId: 1, parentPostId: null, body: 'Удалено', imageUrl: null, status: 'deleted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },
    async closeUserAccount(args) {
      calls.push({ kind: 'closeUserAccount', args });
      return true;
    },
    async listAuthors() { return []; },
    async listOnlineAuthors() { return []; },
    async getAuthor() { return null; },
    async listWorks() { return []; },
    async getWorkById() { return null; },
    async getWorkBySlug() { return null; },
    async listWorkComments() { return []; },
    async listWorkViewers() { return []; },
    async registerWorkView() { return true; },
    async upsertWorkRating() { throw new Error('not needed'); },
    async addWorkComment() { throw new Error('not needed'); },
    async createForumTopic() { throw new Error('not needed'); },
    async createForumPost() { throw new Error('not needed'); },
    async listForumSections() { return []; },
    async listForumTopics() { return []; },
    async getForumTopic() { return null; },
    async listForumPosts() { return []; },
    async listContests() { return []; },
    async listRadioTracks() { return []; },
    async findUserByEmailOrLogin() { return null; },
    async getUserByIdentifier() { return null; },
    async createUser() { throw new Error('not needed'); },
    async updateUserProfile() { throw new Error('not needed'); },
    async getAuthorByUserId() { return null; },
  };
}

function adminContext(repo) {
  return {
    repo,
    jwtSecret: 'test-secret',
    currentUser: {
      id: 99,
      email: 'admin@example.com',
      login: 'admin',
      role: 'admin',
      status: 'active',
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: { displayName: 'Админ' },
    },
    authHeader: '',
    adminUserIds: new Set(['99']),
  };
}

test('env-admin can manage чужие work/forum записи', async () => {
  const repo = makeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  await server.executeOperation({
    query: `mutation {
      updateWork(workId: "101", input: { sectionCode: "poetry", title: "Чужой текст", summary: "", body: "body", excerpt: "", status: "published" }) { id title status }
    }`,
  }, { contextValue: adminContext(repo) });

  await server.executeOperation({
    query: `mutation { deleteWork(workId: "101") { id status } }`,
  }, { contextValue: adminContext(repo) });

  await server.executeOperation({
    query: `mutation { updateForumTopic(topicId: "77", input: { title: "Чужая тема", body: "body" }) { id title status } }`,
  }, { contextValue: adminContext(repo) });

  await server.executeOperation({
    query: `mutation { deleteForumTopic(topicId: "77") { id status } }`,
  }, { contextValue: adminContext(repo) });

  await server.executeOperation({
    query: `mutation { updateForumPost(postId: "501", body: "Исправлено") { id status body } }`,
  }, { contextValue: adminContext(repo) });

  await server.executeOperation({
    query: `mutation { deleteForumPost(postId: "501") { id status } }`,
  }, { contextValue: adminContext(repo) });

  for (const call of repo.calls.filter((item) => item.kind !== 'closeUserAccount')) {
    assert.equal(call.args.canManageAll, true, `${call.kind} should receive canManageAll=true`);
  }

  await server.stop();
});

test('closeMyAccount calls repository soft-close flow', async () => {
  const repo = makeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const result = await server.executeOperation({
    query: `mutation { closeMyAccount }`,
  }, { contextValue: adminContext(repo) });

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.closeMyAccount, true);
  assert.equal(repo.calls.find((item) => item.kind === 'closeUserAccount')?.args?.userId, 99);

  await server.stop();
});
