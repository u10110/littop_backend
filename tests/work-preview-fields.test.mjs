import test from 'node:test';
import assert from 'node:assert/strict';
import { createApolloServer } from '../src/createServer.mjs';

function makeFakeRepo() {
  const author = {
    id: 1, email: 'reader@example.com', login: 'reader', role: 'author', status: 'active',
    registeredAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    profile: { displayName: 'Reader', bio: null, avatarUrl: null, coverImageUrl: null, city: null, websiteUrl: null, ratingTotal: 0, worksCountCached: 0, isClassic: false, isFeatured: false },
  };
  const work = { id: 1, title: 'Читаемый текст', slug: 'readable-text', sectionCode: 'prose', genreSlug: null, summary: '', body: 'body', excerpt: '', status: 'published', projectFormat: null, commentsCount: 0, ratingsCount: 0, averageRating: 0, likesCount: 0, viewsCount: 0, publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorUserId: 1, author };
  return {
    async ping() { return true; },
    async listWorks() { return [work]; },
    async getWorkById() { return work; },
    async getWorkBySlug() { return work; },
    async listAuthors() { return []; }, async listOnlineAuthors() { return []; }, async getAuthor() { return null; },
    async findUserByEmailOrLogin() { return null; }, async getUserByIdentifier() { return null; }, async getUserById() { return author; },
    async listWorkComments() { return []; }, async listWorkViewers() { return []; }, async registerWorkView() { return true; },
    async listForumSections() { return []; }, async listForumTopics() { return []; }, async listContests() { return []; }, async listRadioTracks() { return []; },
  };
}

test('works expose readership count in GraphQL previews', async () => {
  const repo = makeFakeRepo();
  const server = await createApolloServer({ repo, jwtSecret: 'test-secret' });
  const response = await server.executeOperation(
    { query: `query { works(limit: 1) { title viewsCount } }` },
    { contextValue: { repo, jwtSecret: 'test-secret', currentUser: null, authHeader: '' } },
  );
  assert.equal(response.body.singleResult.errors, undefined);
  assert.equal(response.body.singleResult.data.works[0].title, 'Читаемый текст');
  assert.equal(response.body.singleResult.data.works[0].viewsCount, 0);
});
