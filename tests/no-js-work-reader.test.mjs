import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { createHttpServer } from '../src/httpServer.mjs';

const work = {
  id: '139',
  slug: 'все-живое-любит-лето-1790585752418',
  title: 'Всё живое любит лето',
  summary: 'Короткое описание',
  body: '<p>Первая строка<br>Вторая строка</p><p>Новая строфа</p><script>alert(1)</script>',
  status: 'published',
  sectionCode: 'poetry',
  publishedAt: '2026-09-28T08:55:52.418Z',
  author: { id: '45', login: 'test', displayName: 'Автор Тест' },
};

async function startTestServer() {
  const repo = {
    async ping() { return true; },
    async getWorkBySlug(slug) { return slug === work.slug ? { ...work } : null; },
  };
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();
  const nodeServer = createHttpServer({ apolloServer, repo, jwtSecret: 'test-secret' });
  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${nodeServer.address().port}`,
    async close() {
      await new Promise((resolve, reject) => nodeServer.close((error) => error ? reject(error) : resolve()));
      await apolloServer.stop();
    },
  };
}

test('explicit no-JS reader route returns a complete safe work document', async () => {
  const app = await startTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/read/works/${encodeURIComponent(work.slug)}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^text\/html/);
    assert.match(html, /<title>Всё живое любит лето — Литопотам<\/title>/);
    assert.match(html, /Первая строка<br>Вторая строка/);
    assert.match(html, /Новая строфа/);
    assert.match(html, /Автор Тест/);
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /Вернуться к интерактивной версии/);
  } finally {
    await app.close();
  }
});

test('no-JS reader returns an HTML 404 for an unknown work', async () => {
  const app = await startTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/read/works/no-such-work`);
    assert.equal(response.status, 404);
    assert.match(await response.text(), /Произведение не найдено/);
  } finally {
    await app.close();
  }
});
