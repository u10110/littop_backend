import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';

function makeRepo() {
  const user = {
    id: 1,
    email: 'author@example.com',
    login: 'author',
    role: 'author',
    status: 'active',
    registeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Автор',
      bio: 'Биография',
      avatarUrl: null,
      coverImageUrl: null,
      city: 'Москва',
      websiteUrl: null,
      ratingTotal: 0,
      worksCountCached: 1,
      isClassic: false,
      isFeatured: false,
    },
  };

  const authorView = () => ({
    id: user.id,
    email: user.email,
    login: user.login,
    displayName: user.profile.displayName,
    bio: user.profile.bio,
    avatarUrl: user.profile.avatarUrl,
    coverImageUrl: user.profile.coverImageUrl,
    city: user.profile.city,
    websiteUrl: user.profile.websiteUrl,
    ratingTotal: user.profile.ratingTotal,
    worksCountCached: user.profile.worksCountCached,
    isClassic: user.profile.isClassic,
    isFeatured: user.profile.isFeatured,
    registeredAt: user.registeredAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  const work = {
    id: 101,
    title: 'Старый текст',
    slug: 'staryj-tekst-101',
    summary: 'Коротко',
    body: 'Полный текст',
    excerpt: 'Коротко',
    status: 'published',
    sectionCode: 'poetry',
    genreSlug: null,
    projectFormat: null,
    commentsCount: 0,
    ratingsCount: 0,
    averageRating: 0,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: authorView(),
  };

  const forumPost = {
    id: 501,
    topicId: 77,
    userId: user.id,
    parentPostId: null,
    body: 'Старый комментарий',
    imageUrl: null,
    status: 'visible',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: authorView(),
  };

  return {
    async ping() { return true; },
    async updateUserProfile({ userId, displayName, bio = null, avatarUrl = null, coverImageUrl = null, city = null, websiteUrl = null }) {
      assert.equal(String(user.id), String(userId));
      user.profile = {
        ...user.profile,
        displayName,
        bio,
        avatarUrl,
        coverImageUrl,
        city,
        websiteUrl,
      };
      user.updatedAt = new Date().toISOString();
      return {
        ...user,
        profile: { ...user.profile },
      };
    },
    async updateWork({ workId, authorUserId, sectionCode, title, summary = null, body = null, excerpt = null, projectFormat = null, status = 'published' }) {
      if (String(workId) !== String(work.id) || String(authorUserId) !== String(user.id)) {
        throw new Error('Only the owner can edit this work');
      }
      Object.assign(work, {
        sectionCode,
        title,
        summary,
        body,
        excerpt,
        projectFormat,
        status,
        updatedAt: new Date().toISOString(),
        author: authorView(),
      });
      return { ...work };
    },
    async softDeleteWork({ workId, authorUserId }) {
      if (String(workId) !== String(work.id) || String(authorUserId) !== String(user.id)) {
        throw new Error('Only the owner can delete this work');
      }
      work.status = 'archived';
      work.updatedAt = new Date().toISOString();
      work.author = authorView();
      return { ...work };
    },
    async updateForumPost({ postId, authorUserId, body, imageUrl = null }) {
      if (String(postId) !== String(forumPost.id) || String(authorUserId) !== String(user.id)) {
        throw new Error('Only the owner can edit this post');
      }
      forumPost.body = body;
      forumPost.imageUrl = imageUrl;
      forumPost.updatedAt = new Date().toISOString();
      forumPost.author = authorView();
      return { ...forumPost };
    },
    async findUserByEmailOrLogin() { return null; },
    async getUserByIdentifier() { return null; },
    async createUser() { throw new Error('not needed'); },
    async getUserById(id) {
      return String(id) === String(user.id) ? { ...user, profile: { ...user.profile } } : null;
    },
    async listAuthors() { return [authorView()]; },
    async listWorks() { return [{ ...work, author: authorView() }]; },
    async createWork() { throw new Error('not needed'); },
    async getWorkById(id) {
      return String(id) === String(work.id) ? { ...work, author: authorView() } : null;
    },
    async upsertWorkRating() { throw new Error('not needed'); },
    async addWorkComment() { throw new Error('not needed'); },
    async listWorkComments() { return []; },
    async listForumSections() { return []; },
    async listForumTopics() { return []; },
    async getForumTopic() { return null; },
    async createForumTopic() { throw new Error('not needed'); },
    async createForumPost() { throw new Error('not needed'); },
    async listForumPosts() { return []; },
    async listContests() { return []; },
    async listRadioTracks() { return []; },
  };
}

test('updateMyProfile persists avatar and cover image urls', async () => {
  const repo = makeRepo();
  const currentUser = await repo.getUserById(1);
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const result = await server.executeOperation({
    query: `mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
      updateMyProfile(input: $input) {
        profile {
          displayName
          avatarUrl
          coverImageUrl
        }
      }
    }`,
    variables: {
      input: {
        displayName: 'Обновлённый автор',
        bio: 'Новая биография',
        city: 'Москва',
        websiteUrl: 'https://example.com',
        avatarUrl: 'https://cdn.test/avatar.webp',
        coverImageUrl: 'https://cdn.test/cover.webp',
      },
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '' },
  });

  assert.equal(result.body.kind, 'single');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.displayName, 'Обновлённый автор');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.avatarUrl, 'https://cdn.test/avatar.webp');
  assert.equal(result.body.singleResult.data.updateMyProfile.profile.coverImageUrl, 'https://cdn.test/cover.webp');

  await server.stop();
});

test('owner can update and soft delete work', async () => {
  const repo = makeRepo();
  const currentUser = await repo.getUserById(1);
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const updated = await server.executeOperation({
    query: `mutation UpdateWork($workId: ID!, $input: UpdateWorkInput!) {
      updateWork(workId: $workId, input: $input) {
        id
        title
        status
        sectionCode
        summary
      }
    }`,
    variables: {
      workId: '101',
      input: {
        sectionCode: 'prose',
        title: 'Новый заголовок',
        summary: 'Новое описание',
        body: 'Новый полный текст',
        excerpt: 'Новое описание',
      },
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '' },
  });

  assert.equal(updated.body.kind, 'single');
  assert.equal(updated.body.singleResult.data.updateWork.title, 'Новый заголовок');
  assert.equal(updated.body.singleResult.data.updateWork.sectionCode, 'prose');

  const deleted = await server.executeOperation({
    query: `mutation DeleteWork($workId: ID!) {
      deleteWork(workId: $workId) {
        id
        status
      }
    }`,
    variables: { workId: '101' },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '' },
  });

  assert.equal(deleted.body.kind, 'single');
  assert.equal(deleted.body.singleResult.data.deleteWork.status, 'archived');

  await server.stop();
});

test('forum post editing is limited to owner', async () => {
  const repo = makeRepo();
  const currentUser = await repo.getUserById(1);
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();

  const updated = await server.executeOperation({
    query: `mutation UpdateForumPost($postId: ID!, $body: String!, $imageUrl: String) {
      updateForumPost(postId: $postId, body: $body, imageUrl: $imageUrl) {
        id
        body
        imageUrl
      }
    }`,
    variables: {
      postId: '501',
      body: 'Исправленный комментарий',
      imageUrl: 'https://cdn.test/forum-post.webp',
    },
  }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '' },
  });

  assert.equal(updated.body.kind, 'single');
  assert.equal(updated.body.singleResult.data.updateForumPost.body, 'Исправленный комментарий');
  assert.equal(updated.body.singleResult.data.updateForumPost.imageUrl, 'https://cdn.test/forum-post.webp');

  const denied = await server.executeOperation({
    query: `mutation UpdateForumPost($postId: ID!, $body: String!) {
      updateForumPost(postId: $postId, body: $body) {
        id
        body
      }
    }`,
    variables: {
      postId: '501',
      body: 'Чужая правка',
    },
  }, {
    contextValue: {
      repo,
      jwtSecret: 'test-secret',
      currentUser: { ...currentUser, id: 999 },
      authHeader: '',
    },
  });

  assert.equal(denied.body.kind, 'single');
  assert.match(denied.body.singleResult.errors[0].message, /Only the owner can edit this post/);

  await server.stop();
});
