import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApolloServer } from '../src/createServer.mjs';
import { issueToken } from '../src/auth.mjs';
import { createHttpServer } from '../src/httpServer.mjs';

function makeFakeRepo() {
  const users = [{
    id: 11,
    email: 'forum@example.com',
    login: 'forum-author',
    role: 'author',
    status: 'active',
    registeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Форум Автор',
      bio: null,
      city: null,
      websiteUrl: null,
      ratingTotal: 0,
      worksCountCached: 0,
      isClassic: false,
      isFeatured: false,
    },
  }];

  return {
    async ping() {
      return true;
    },
    async getUserById(id) {
      return users.find((user) => String(user.id) === String(id)) ?? null;
    },
  };
}

async function startTestServer() {
  const uploadDir = await mkdtemp(join(tmpdir(), 'littop-forum-upload-'));
  const repo = makeFakeRepo();
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();

  const nodeServer = createHttpServer({
    apolloServer,
    repo,
    jwtSecret: 'test-secret',
    env: {
      FORUM_UPLOAD_DIR: uploadDir,
    },
  });

  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  const address = nodeServer.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    repo,
    apolloServer,
    nodeServer,
    baseUrl,
    uploadDir,
    async close() {
      await new Promise((resolve, reject) => nodeServer.close((error) => (error ? reject(error) : resolve())));
      await apolloServer.stop();
      await rm(uploadDir, { recursive: true, force: true });
    },
  };
}

test('authenticated user can upload forum message image and file is served back', async () => {
  const app = await startTestServer();
  try {
    const user = await app.repo.getUserById(11);
    const token = issueToken(user, 'test-secret');
    const payloadBuffer = Buffer.from('fake image bytes for forum post');
    const uploadResponse = await fetch(`${app.baseUrl}/api/forum/upload-image`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: 'post-image.png',
        mimeType: 'image/png',
        contentBase64: payloadBuffer.toString('base64'),
      }),
    });

    assert.equal(uploadResponse.status, 201);
    const uploadJson = await uploadResponse.json();
    assert.equal(uploadJson.ok, true);
    assert.match(uploadJson.imageUrl, /^http:\/\/127\.0\.0\.1:\d+\/media\/forum\//);

    const storedFilePath = join(app.uploadDir, uploadJson.storedFileName);
    const storedBuffer = await readFile(storedFilePath);
    assert.deepEqual(storedBuffer, payloadBuffer);

    const mediaResponse = await fetch(uploadJson.imageUrl);
    assert.equal(mediaResponse.status, 200);
    assert.equal(mediaResponse.headers.get('content-type'), 'image/png');
    const servedBuffer = Buffer.from(await mediaResponse.arrayBuffer());
    assert.deepEqual(servedBuffer, payloadBuffer);
  } finally {
    await app.close();
  }
});

test('forum image upload endpoint requires auth', async () => {
  const app = await startTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/api/forum/upload-image`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'post-image.png',
        mimeType: 'image/png',
        contentBase64: Buffer.from('x').toString('base64'),
      }),
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.error, 'Authentication required');
  } finally {
    await app.close();
  }
});
