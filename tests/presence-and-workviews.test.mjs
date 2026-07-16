import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';

function makeRepo() {
  const currentUser = {
    id: 2,
    email: 'reader@example.com',
    login: 'reader',
    role: 'author',
    status: 'active',
    registeredAt: new Date('2026-06-20T10:00:00.000Z').toISOString(),
    lastLoginAt: null,
    lastSeenAt: new Date('2026-06-20T10:04:00.000Z').toISOString(),
    isOnline: true,
    createdAt: new Date('2026-06-20T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-06-20T10:04:00.000Z').toISOString(),
    profile: {
      displayName: 'Читатель',
      bio: null,
      avatarUrl: null,
      coverImageUrl: null,
      city: 'Москва',
      websiteUrl: null,
      ratingTotal: 0,
      worksCountCached: 0,
      isClassic: false,
      isFeatured: false,
    },
  };

  const author = {
    id: 1,
    email: 'author@example.com',
    login: 'author',
    displayName: 'Автор',
    bio: null,
    avatarUrl: null,
    coverImageUrl: null,
    city: 'Москва',
    websiteUrl: null,
    ratingTotal: 0,
    worksCountCached: 1,
    isClassic: false,
    isFeatured: false,
    registeredAt: new Date('2026-06-20T09:00:00.000Z').toISOString(),
    lastSeenAt: new Date('2026-06-20T10:03:00.000Z').toISOString(),
    isOnline: true,
    createdAt: new Date('2026-06-20T09:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-06-20T10:03:00.000Z').toISOString(),
  };

  const work = {
    id: 101,
    title: 'Проверка просмотров',
    slug: 'proverka-prosmotrov-101',
    summary: 'Кратко',
    body: 'Полный текст',
    excerpt: 'Кратко',
    status: 'published',
    sectionCode: 'poetry',
    genreSlug: null,
    projectFormat: null,
    commentsCount: 1,
    ratingsCount: 0,
    averageRating: 0,
    publishedAt: new Date('2026-06-20T10:00:00.000Z').toISOString(),
    createdAt: new Date('2026-06-20T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-06-20T10:00:00.000Z').toISOString(),
    authorUserId: author.id,
    author,
  };

  const viewers = [];
  let touchedUserId = null;

  return {
    get touchedUserId() {
      return touchedUserId;
    },
    async ping() { return true; },
    async getUserById(id) {
      if (String(id) === String(currentUser.id)) {
        return { ...currentUser };
      }
      return null;
    },
    async listAuthors() { return [author]; },
    async listOnlineAuthors() { return [author]; },
    async getAuthor() { return author; },
    async getAuthorByUserId(id) {
      if (String(id) === String(author.id)) return author;
      if (String(id) === String(currentUser.id)) {
        return {
          id: currentUser.id,
          email: currentUser.email,
          login: currentUser.login,
          displayName: currentUser.profile.displayName,
          bio: currentUser.profile.bio,
          avatarUrl: currentUser.profile.avatarUrl,
          coverImageUrl: currentUser.profile.coverImageUrl,
          city: currentUser.profile.city,
          websiteUrl: currentUser.profile.websiteUrl,
          ratingTotal: currentUser.profile.ratingTotal,
          worksCountCached: currentUser.profile.worksCountCached,
          isClassic: currentUser.profile.isClassic,
          isFeatured: currentUser.profile.isFeatured,
          registeredAt: currentUser.registeredAt,
          lastSeenAt: currentUser.lastSeenAt,
          isOnline: currentUser.isOnline,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt,
        };
      }
      return null;
    },
    async listWorks() { return [work]; },
    async getWorkById(id) { return String(id) === String(work.id) ? { ...work } : null; },
    async getWorkBySlug(slug) { return slug === work.slug ? { ...work } : null; },
    async listWorkComments() { return []; },
    async listWorkViewers({ workId }) {
      assert.equal(String(workId), String(work.id));
      return viewers;
    },
    async registerWorkView({ workId, viewerUserId }) {
      viewers.push({
        id: viewers.length + 1,
        workId,
        viewerUserId,
        viewedAt: new Date('2026-06-20T10:05:00.000Z').toISOString(),
        viewer: {
          id: currentUser.id,
          email: currentUser.email,
          login: currentUser.login,
          displayName: currentUser.profile.displayName,
          bio: currentUser.profile.bio,
          avatarUrl: currentUser.profile.avatarUrl,
          coverImageUrl: currentUser.profile.coverImageUrl,
          city: currentUser.profile.city,
          websiteUrl: currentUser.profile.websiteUrl,
          ratingTotal: currentUser.profile.ratingTotal,
          worksCountCached: currentUser.profile.worksCountCached,
          isClassic: currentUser.profile.isClassic,
          isFeatured: currentUser.profile.isFeatured,
          registeredAt: currentUser.registeredAt,
          lastSeenAt: currentUser.lastSeenAt,
          isOnline: currentUser.isOnline,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt,
        },
      });
      return true;
    },
    async touchUserPresence(userId) {
      touchedUserId = userId;
      return { ...currentUser };
    },
    async findUserByEmailOrLogin() { return null; },
    async getUserByIdentifier() { return null; },
    async createUser() { throw new Error('not needed'); },
    async updateUserProfile() { throw new Error('not needed'); },
    async createWork() { throw new Error('not needed'); },
    async updateWork() { throw new Error('not needed'); },
    async softDeleteWork() { throw new Error('not needed'); },
    async upsertWorkRating() { throw new Error('not needed'); },
    async addWorkComment() { throw new Error('not needed'); },
    async listForumSections() { return []; },
    async listForumTopics() { return []; },
    async getForumTopic() { return null; },
    async createForumTopic() { throw new Error('not needed'); },
    async createForumPost() { throw new Error('not needed'); },
    async updateForumPost() { throw new Error('not needed'); },
    async listForumPosts() { return []; },
    async listContests() { return []; },
    async listRadioTracks() { return []; },
  };
}

test('onlineAuthors query and workViewers query expose new discussion data', async () => {
  const repo = makeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const workResult = await server.executeOperation({
    query: `query WorkAndViewers($id: ID!, $limit: Int!) {
      work(id: $id) {
        id
        title
      }
      workViewers(workId: $id, limit: $limit) {
        id
        workId
        viewerUserId
        viewer {
          login
          displayName
        }
      }
    }`,
    variables: { id: '101', limit: 20 },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: await repo.getUserById(2), authHeader: '' },
  });

  assert.equal(workResult.body.kind, 'single');
  assert.equal(workResult.body.singleResult.data.work.id, '101');
  assert.equal(workResult.body.singleResult.data.workViewers[0].viewer.login, 'reader');

  const onlineResult = await server.executeOperation({
    query: `query {
      onlineAuthors(limit: 5) {
        login
        displayName
        isOnline
      }
    }`,
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: await repo.getUserById(2), authHeader: '' },
  });

  assert.equal(onlineResult.body.kind, 'single');
  assert.equal(onlineResult.body.singleResult.data.onlineAuthors[0].login, 'author');
  assert.equal(onlineResult.body.singleResult.data.onlineAuthors[0].isOnline, true);
  await server.stop();
});

test('touchPresence mutation updates current user presence timestamp', async () => {
  const repo = makeRepo();
  const currentUser = await repo.getUserById(2);
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const result = await server.executeOperation({
    query: `mutation {
      touchPresence {
        id
        isOnline
      }
    }`,
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '' },
  });

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.touchPresence.id, '2');
  assert.equal(result.body.singleResult.data.touchPresence.isOnline, true);
  assert.equal(repo.touchedUserId, 2);
  await server.stop();
});
