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
    id: 17, email: 'work-audio@example.com', login: 'work-audio-author', role: 'author', status: 'active',
    registeredAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    profile: { displayName: 'Автор аудио', ratingTotal: 0, worksCountCached: 0, isClassic: false, isFeatured: false },
  };
  return { async ping() { return true; }, async getUserById(id) { return String(id) === '17' ? user : null; } };
}

async function startTestServer() {
  const uploadDir = await mkdtemp(join(tmpdir(), 'littop-work-audio-upload-'));
  const repo = makeFakeRepo();
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();
  const nodeServer = createHttpServer({ apolloServer, repo, jwtSecret: 'test-secret', env: { AUDIO_UPLOAD_DIR: uploadDir } });
  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  const { port } = nodeServer.address();
  return {
    repo, baseUrl: `http://127.0.0.1:${port}`, uploadDir,
    async close() {
      await new Promise((resolve, reject) => nodeServer.close((error) => error ? reject(error) : resolve()));
      await apolloServer.stop();
      await rm(uploadDir, { recursive: true, force: true });
    },
  };
}

test('authenticated author uploads work audio through the shared work-media endpoint', async () => {
  const app = await startTestServer();
  try {
    const token = issueToken(await app.repo.getUserById(17), 'test-secret');
    const content = Buffer.from('fake work audio bytes');
    const response = await fetch(`${app.baseUrl}/api/works/upload-file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'audio', fileName: 'chapters.mp3', mimeType: 'audio/mpeg', contentBase64: content.toString('base64') }),
    });
    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.kind, 'audio');
    assert.equal(payload.fileName, 'chapters.mp3');
    assert.match(payload.storedFileName, /^work-audio-/);
    assert.match(payload.url, /^http:\/\/127\.0\.0\.1:\d+\/media\/audio\//);
    assert.deepEqual(await readFile(join(app.uploadDir, payload.storedFileName)), content);
    const served = await fetch(payload.url);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), content);
  } finally {
    await app.close();
  }
});

test('work audio upload rejects an unsupported format', async () => {
  const app = await startTestServer();
  try {
    const token = issueToken(await app.repo.getUserById(17), 'test-secret');
    const response = await fetch(`${app.baseUrl}/api/works/upload-file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'audio', fileName: 'notes.txt', mimeType: 'text/plain', contentBase64: Buffer.from('x').toString('base64') }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /mp3, wav, ogg, webm, m4a, aac и flac/);
  } finally {
    await app.close();
  }
});

test('work audio upload requires auth', async () => {
  const app = await startTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/api/works/upload-file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'audio', fileName: 'chapters.mp3', mimeType: 'audio/mpeg', contentBase64: Buffer.from('x').toString('base64') }),
    });
    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.error, 'Authentication required');
  } finally {
    await app.close();
  }
});
