import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApolloServer } from '../src/createServer.mjs';
import { issueToken } from '../src/auth.mjs';
import { createHttpServer } from '../src/httpServer.mjs';

function makeFakeRepo() {
  const user = {
    id: 17, email: 'work-image@example.com', login: 'work-image-author', role: 'author', status: 'active',
    registeredAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    profile: { displayName: 'Автор изображения', ratingTotal: 0, worksCountCached: 0, isClassic: false, isFeatured: false },
  };
  return { async ping() { return true; }, async getUserById(id) { return String(id) === '17' ? user : null; } };
}

async function startTestServer() {
  const uploadDir = await mkdtemp(join(tmpdir(), 'littop-work-image-upload-'));
  const repo = makeFakeRepo();
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();
  const nodeServer = createHttpServer({ apolloServer, repo, jwtSecret: 'test-secret', env: { WORK_MEDIA_UPLOAD_DIR: uploadDir } });
  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  const { port } = nodeServer.address();
  return { repo, baseUrl: `http://127.0.0.1:${port}`, uploadDir, async close() { await new Promise((resolve, reject) => nodeServer.close((error) => error ? reject(error) : resolve())); await apolloServer.stop(); await rm(uploadDir, { recursive: true, force: true }); } };
}

test('authenticated author uploads work image through the shared work-media storage endpoint', async () => {
  const app = await startTestServer();
  try {
    const token = issueToken(await app.repo.getUserById(17), 'test-secret');
    const content = Buffer.from('work editor image');
    const response = await fetch(`${app.baseUrl}/api/works/upload-file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'image', fileName: 'illustration.png', mimeType: 'image/png', contentBase64: content.toString('base64') }),
    });
    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.kind, 'image');
    assert.match(payload.url, /^http:\/\/127\.0\.0\.1:\d+\/media\/works\//);
    assert.deepEqual(await readFile(join(app.uploadDir, payload.storedFileName)), content);
    const served = await fetch(payload.url);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), content);
  } finally { await app.close(); }
});
