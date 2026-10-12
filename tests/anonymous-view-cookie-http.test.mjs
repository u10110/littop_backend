import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { createHttpServer } from '../src/httpServer.mjs';

const work = { id: '7', slug: 'anon-view-once', title: 'Стих', status: 'published', sectionCode: 'poetry', author: { id: '45' } };

async function startApp() {
  const views = [];
  const repo = {
    async ping() { return true; },
    async getWorkBySlug(slug) { return slug === work.slug ? { ...work } : null; },
    async getWorkById(id) { return String(id) === String(work.id) ? { ...work } : null; },
    async registerWorkView(args) { views.push(args); },
    async hasUserLikedWork() { return false; },
    async hasUserDislikedWork() { return false; },
    async hasWorkAnnouncement() { return false; },
    async getAuthorByUserId() { return null; },
  };
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();
  const nodeServer = createHttpServer({ apolloServer, repo, jwtSecret: 'test-secret' });
  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  return {
    views,
    baseUrl: `http://127.0.0.1:${nodeServer.address().port}`,
    async close() {
      await new Promise((resolve, reject) => nodeServer.close((error) => error ? reject(error) : resolve()));
      await apolloServer.stop();
    },
  };
}

const WORK_QUERY = JSON.stringify({ query: 'query($slug: String!){ work(slug: $slug){ id } }', variables: { slug: work.slug } });

test('anonymous view is counted once per browser: first visit sets cookie, refreshes do not count', async () => {
  const app = await startApp();
  try {
    const first = await fetch(`${app.baseUrl}/api`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: WORK_QUERY });
    assert.equal(first.status, 200);
    const setCookie = first.headers.get('set-cookie') || '';
    assert.match(setCookie, /littop_read_mark=7/);
    assert.equal(app.views.length, 1);
    assert.equal(app.views[0].viewerUserId, null);

    const cookie = setCookie.split(';')[0];
    for (let i = 0; i < 3; i += 1) {
      const refresh = await fetch(`${app.baseUrl}/api`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: WORK_QUERY });
      assert.equal(refresh.status, 200);
    }
    assert.equal(app.views.length, 1, 'refreshes with the read-mark cookie must not register extra views');
    assert.equal(app.views.filter((v) => v.workId === work.id).length, 1);
  } finally {
    await app.close();
  }
});

test('a different browser (no cookie) still counts its own single view', async () => {
  const app = await startApp();
  try {
    const first = await fetch(`${app.baseUrl}/api`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: WORK_QUERY });
    assert.equal(first.status, 200);
    assert.equal(app.views.length, 1);
    const secondBrowser = await fetch(`${app.baseUrl}/api`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: WORK_QUERY });
    assert.equal(secondBrowser.status, 200);
    assert.equal(app.views.length, 2);
  } finally {
    await app.close();
  }
});
