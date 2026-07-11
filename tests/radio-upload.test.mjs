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
    id: 7,
    email: 'author@example.com',
    login: 'radio-author',
    role: 'author',
    status: 'active',
    registeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      displayName: 'Радио Автор',
      bio: null,
      city: null,
      websiteUrl: null,
      ratingTotal: 0,
      worksCountCached: 0,
      isClassic: false,
      isFeatured: false,
    },
  }];
  const tracks = [];

  return {
    async ping() {
      return true;
    },
    async getUserById(id) {
      return users.find((user) => String(user.id) === String(id)) ?? null;
    },
    async createRadioTrack({ title, authorName, durationSeconds, audioUrl }) {
      const track = {
        id: tracks.length + 1,
        title,
        authorName,
        durationSeconds: durationSeconds == null ? null : Number(durationSeconds),
        audioUrl,
        sourceUrl: null,
        averageRating: 0,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tracks.push(track);
      return track;
    },
    get tracks() {
      return tracks;
    },
  };
}

async function startTestServer() {
  const uploadDir = await mkdtemp(join(tmpdir(), 'littop-radio-upload-'));
  const repo = makeFakeRepo();
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();

  const nodeServer = createHttpServer({
    apolloServer,
    repo,
    jwtSecret: 'test-secret',
    env: {
      AUDIO_UPLOAD_DIR: uploadDir,
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

test('authenticated user can upload audio from cabinet and file is served back', async () => {
  const app = await startTestServer();
  try {
    const user = await app.repo.getUserById(7);
    const token = issueToken(user, 'test-secret');
    const payloadBuffer = Buffer.from('fake mp3 bytes for test');
    const uploadResponse = await fetch(`${app.baseUrl}/api/radio/upload`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Новый эфир',
        fileName: 'efir.mp3',
        mimeType: 'audio/mpeg',
        contentBase64: payloadBuffer.toString('base64'),
        durationSeconds: 95,
      }),
    });

    assert.equal(uploadResponse.status, 201);
    const uploadJson = await uploadResponse.json();
    assert.equal(uploadJson.ok, true);
    assert.equal(uploadJson.track.title, 'Новый эфир');
    assert.equal(uploadJson.track.authorName, 'Радио Автор');
    assert.equal(uploadJson.track.durationSeconds, 95);
    assert.match(uploadJson.audioUrl, /^http:\/\/127\.0\.0\.1:\d+\/media\/audio\//);
    assert.equal(app.repo.tracks.length, 1);

    const storedFilePath = join(app.uploadDir, uploadJson.storedFileName);
    const storedBuffer = await readFile(storedFilePath);
    assert.deepEqual(storedBuffer, payloadBuffer);

    const mediaResponse = await fetch(uploadJson.audioUrl);
    assert.equal(mediaResponse.status, 200);
    assert.equal(mediaResponse.headers.get('content-type'), 'audio/mpeg');
    const servedBuffer = Buffer.from(await mediaResponse.arrayBuffer());
    assert.deepEqual(servedBuffer, payloadBuffer);
  } finally {
    await app.close();
  }
});

test('upload endpoint requires auth', async () => {
  const app = await startTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/api/radio/upload`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Без токена',
        fileName: 'track.mp3',
        mimeType: 'audio/mpeg',
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
