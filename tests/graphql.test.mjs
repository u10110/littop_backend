import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { issueToken } from '../src/auth.mjs';

function makeFakeRepo() {
  let userId = 1;
  let workId = 100;
  const users = [];
  const works = [];

  return {
    async ping() {
      return true;
    },
    async findUserByEmailOrLogin(email, login) {
      return users.find((user) => user.email === email || user.login === login) ?? null;
    },
    async getUserByIdentifier(identifier) {
      return users.find((user) => user.email === identifier || user.login === identifier) ?? null;
    },
    async createUser({ email, login, passwordHash, displayName }) {
      const user = {
        id: userId++,
        email,
        login,
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
          isFeatured: false
        }
      };
      users.push(user);
      return user;
    },
    async getUserById(id) {
      return users.find((user) => String(user.id) === String(id)) ?? null;
    },
    async updateUserProfile({ userId, displayName, bio = null, city = null, websiteUrl = null }) {
      const user = users.find((item) => String(item.id) === String(userId));
      if (!user) return null;
      user.profile = {
        ...user.profile,
        displayName,
        bio,
        city,
        websiteUrl,
      };
      user.updatedAt = new Date().toISOString();
      return user;
    },
    async listAuthors() {
      return users.map((user) => ({
        id: user.id,
        login: user.login,
        email: user.email,
        displayName: user.profile.displayName,
        bio: user.profile.bio,
        city: user.profile.city,
        websiteUrl: user.profile.websiteUrl,
        ratingTotal: user.profile.ratingTotal,
        worksCountCached: user.profile.worksCountCached,
        isClassic: user.profile.isClassic,
        isFeatured: user.profile.isFeatured,
        registeredAt: user.registeredAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
    },
    async listWorks() {
      return works;
    },
    async createWork({ authorUserId, sectionCode, title, summary, body, excerpt, status, projectFormat }) {
      const work = {
        id: workId++,
        title,
        slug: `${title.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-')}-${workId}`,
        summary,
        body,
        excerpt,
        status,
        projectFormat,
        sectionCode,
        genreSlug: null,
        authorUserId,
        author: users.find((user) => String(user.id) === String(authorUserId)) ?? null,
        commentsCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      works.push(work);
      return work;
    },
    async getWorkById(id) {
      return works.find((work) => String(work.id) === String(id)) ?? null;
    },
    async upsertWorkRating({ workId, userId, rating }) {
      const work = works.find((item) => String(item.id) === String(workId));
      work.ratingsCount = 1;
      work.averageRating = rating;
      return { workId, userId, rating, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },
    async addWorkComment({ workId, userId, body, parentCommentId = null }) {
      const work = works.find((item) => String(item.id) === String(workId));
      work.commentsCount += 1;
      return { id: 1, workId, userId, body, parentCommentId, status: 'visible', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },
    async listForumSections() { return []; },
    async listForumTopics() { return []; },
    async getForumTopic() { return null; },
    async createForumTopic() { throw new Error('not implemented in fake repo'); },
    async createForumPost() { throw new Error('not implemented in fake repo'); },
    async listForumPosts() { return []; },
    async listContests() { return []; },
    async listRadioTracks() { return []; }
  };
}

test('health query works', async () => {
  const repo = makeFakeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  const result = await server.executeOperation(
    { query: 'query { health { status ok database } }' },
    { contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' } },
  );
  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.health.status, 'ok');
  assert.equal(result.body.singleResult.data.health.ok, true);
  assert.equal(result.body.singleResult.data.health.database, true);
  await server.stop();
});

test('register mutation returns token and user', async () => {
  const repo = makeFakeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  const result = await server.executeOperation({
    query: `mutation Register($input: RegisterInput!) {
      register(input: $input) {
        token
        user { id login email profile { displayName } }
      }
    }`,
    variables: {
      input: {
        email: 'neo@example.com',
        login: 'neo',
        password: 's3cret-pass',
        displayName: 'Neo'
      }
    }
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' }
  });
  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.register.user.login, 'neo');
  assert.equal(result.body.singleResult.data.register.user.profile.displayName, 'Neo');
  assert.ok(result.body.singleResult.data.register.token);
  await server.stop();
});

test('updateMyProfile saves current user profile fields', async () => {
  const repo = makeFakeRepo();
  const bootstrapUser = await repo.createUser({
    email: 'cabinet@example.com',
    login: 'cabinet',
    passwordHash: 'hash',
    displayName: 'Cabinet User'
  });
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const result = await server.executeOperation({
    query: `mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
      updateMyProfile(input: $input) {
        id
        profile {
          displayName
          city
          websiteUrl
          bio
        }
      }
    }`,
    variables: {
      input: {
        displayName: 'Новый автор',
        city: 'Москва',
        websiteUrl: 'https://example.com',
        bio: 'Обновлённое описание'
      }
    }
  }, {
    contextValue: {
      repo,
      jwtSecret: 'test-secret',
      currentUser: bootstrapUser,
      authHeader: ''
    }
  });

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.displayName, 'Новый автор');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.city, 'Москва');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.websiteUrl, 'https://example.com');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.bio, 'Обновлённое описание');

  await server.stop();
});

test('createWork requires auth and returns created work for authenticated author', async () => {
  const repo = makeFakeRepo();
  const bootstrapUser = await repo.createUser({
    email: 'writer@example.com',
    login: 'writer',
    passwordHash: 'hash',
    displayName: 'Writer'
  });
  const token = issueToken({ id: bootstrapUser.id, login: bootstrapUser.login }, 'test-secret');
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const denied = await server.executeOperation({
    query: `mutation CreateWork($input: CreateWorkInput!) {
      createWork(input: $input) { id title sectionCode }
    }`,
    variables: {
      input: {
        sectionCode: 'poetry',
        title: 'Новый текст',
        summary: 'кратко',
        body: 'полный текст',
        status: 'published'
      }
    }
  });
  assert.equal(denied.body.kind, 'single');
  assert.match(denied.body.singleResult.errors[0].message, /Authentication required/);

  const allowed = await server.executeOperation({
    query: `mutation CreateWork($input: CreateWorkInput!) {
      createWork(input: $input) { id title sectionCode author { login } }
    }`,
    variables: {
      input: {
        sectionCode: 'poetry',
        title: 'Новый текст',
        summary: 'кратко',
        body: 'полный текст',
        status: 'published'
      }
    }
  }, {
    contextValue: {
      repo,
      jwtSecret: 'test-secret',
      currentUser: bootstrapUser,
      authToken: token
    }
  });
  assert.equal(allowed.body.kind, 'single');
  assert.equal(allowed.body.singleResult.data.createWork.title, 'Новый текст');
  assert.equal(allowed.body.singleResult.data.createWork.sectionCode, 'poetry');
  assert.equal(allowed.body.singleResult.data.createWork.author.login, 'writer');

  await server.stop();
});
