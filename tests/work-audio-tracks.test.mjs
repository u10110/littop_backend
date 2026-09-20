import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { createPostgresRepository } from '../src/postgresRepository.mjs';

const author = {
  id: '17', login: 'author', email: 'author@example.test', role: 'author', status: 'active',
  registeredAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  profile: { displayName: 'Author', ratingTotal: 0, worksCountCached: 0, isClassic: false, isFeatured: false },
};

function workWithDefaults(overrides = {}) {
  return {
    id: '100', title: 'Audio work', slug: 'audio-work', summary: null, body: null, excerpt: null,
    status: 'published', sectionCode: 'poetry', genreSlug: null, projectFormat: null,
    pdfUrl: null, pdfFileName: null, audioUrl: null, audioFileName: null,
    commentsCount: 0, ratingsCount: 0, averageRating: 0, likesCount: 0, dislikesCount: 0,
    announcementActive: false, announcementCount: 0, radioRecommended: false,
    publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    author, ...overrides,
  };
}

test('createWork and updateWork expose and forward multiple audio tracks', async () => {
  const calls = [];
  const tracks = [
    { url: 'https://cdn.test/audio/part-1.mp3', title: 'Часть первая', fileName: 'part-1.mp3' },
    { url: 'https://cdn.test/audio/part-2.mp3', title: 'Часть вторая', fileName: 'part-2.mp3' },
  ];
  const repo = {
    async ping() { return true; },
    async createWork(args) { calls.push({ kind: 'create', args }); return workWithDefaults({ audioTracks: args.audioTracks }); },
    async updateWork(args) { calls.push({ kind: 'update', args }); return workWithDefaults({ audioTracks: args.audioTracks }); },
  };
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  try {
    const contextValue = { repo, jwtSecret: 'test-secret', currentUser: author, authHeader: '' };
    const create = await server.executeOperation({
      query: `mutation Create($input: CreateWorkInput!) { createWork(input: $input) { audioTracks { url title fileName } } }`,
      variables: { input: { sectionCode: 'poetry', title: 'Audio work', audioTracks: tracks } },
    }, { contextValue });
    assert.equal(create.body.kind, 'single');
    assert.equal(create.body.singleResult.errors, undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(create.body.singleResult.data.createWork.audioTracks)), tracks);
    assert.deepEqual(calls[0].args.audioTracks, tracks);

    const update = await server.executeOperation({
      query: `mutation Update($input: UpdateWorkInput!) { updateWork(workId: "100", input: $input) { audioTracks { url title fileName } } }`,
      variables: { input: { sectionCode: 'poetry', title: 'Audio work', audioTracks: tracks } },
    }, { contextValue });
    assert.equal(update.body.kind, 'single');
    assert.equal(update.body.singleResult.errors, undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(update.body.singleResult.data.updateWork.audioTracks)), tracks);
    assert.deepEqual(calls[1].args.audioTracks, tracks);
  } finally {
    await server.stop();
  }
});

test('createWork accepts audio tracks without title (legacy clients) and the repository derives one', async () => {
  const calls = [];
  const legacyTracks = [
    { url: 'https://cdn.test/audio/old-1.mp3', fileName: 'old-1.mp3' },
    { url: 'https://cdn.test/audio/old-2.mp3' },
  ];
  const repo = {
    async ping() { return true; },
    async createWork(args) { calls.push({ kind: 'create', args }); return workWithDefaults({ audioTracks: normalizeAudioTracksForTest(args.audioTracks) }); },
  };
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  try {
    const contextValue = { repo, jwtSecret: 'test-secret', currentUser: author, authHeader: '' };
    const create = await server.executeOperation({
      query: `mutation Create($input: CreateWorkInput!) { createWork(input: $input) { audioTracks { url title fileName } } }`,
      variables: { input: { sectionCode: 'poetry', title: 'Audio work', audioTracks: legacyTracks } },
    }, { contextValue });
    assert.equal(create.body.kind, 'single');
    assert.equal(create.body.singleResult.errors, undefined);
    const result = create.body.singleResult.data.createWork.audioTracks;
    assert.deepEqual(JSON.parse(JSON.stringify(result)), [
      { url: 'https://cdn.test/audio/old-1.mp3', title: 'old-1.mp3', fileName: 'old-1.mp3' },
      { url: 'https://cdn.test/audio/old-2.mp3', title: 'Аудиоверсия', fileName: null },
    ]);
    assert.deepEqual(calls[0].args.audioTracks, legacyTracks);
  } finally {
    await server.stop();
  }
});

function normalizeAudioTracksForTest(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((track) => {
    const fileName = track?.fileName || null;
    const title = track?.title || fileName || 'Аудиоверсия';
    return { url: track.url, title, ...(fileName ? { fileName } : {}) };
  });
}

test('repository maps legacy audio columns to a fallback audio track', async () => {
  const pool = {
    async query() {
      return { rows: [{
        id: '100', title: 'Legacy audio', slug: 'legacy-audio', summary: null, body: null, excerpt: null,
        status: 'published', section_code: 'poetry', genre_slug: null, project_format: null,
        pdf_url: null, pdf_file_name: null, audio_url: 'https://cdn.test/audio/legacy.mp3', audio_file_name: 'legacy.mp3',
        audio_tracks: [], comments_count: 0, ratings_count: 0, average_rating: 0, likes_count: 0, dislikes_count: 0,
        announcement_active: false, announcement_count: 0, radio_recommended: false,
        author_id: '17', author_login: 'author', author_email: 'author@example.test', author_display_name: 'Author',
      }] };
    },
  };
  const work = await createPostgresRepository(pool).getWorkById('100');
  assert.deepEqual(work.audioTracks, [{ url: 'https://cdn.test/audio/legacy.mp3', title: 'legacy.mp3', fileName: 'legacy.mp3' }]);
});

test('repository normalizes stored audio tracks and derives titles for pre-title rows', async () => {
  const pool = {
    async query() {
      return { rows: [{
        id: '101', title: 'Stored tracks', slug: 'stored-tracks', summary: null, body: null, excerpt: null,
        status: 'published', section_code: 'poetry', genre_slug: null, project_format: null,
        pdf_url: null, pdf_file_name: null, audio_url: null, audio_file_name: null,
        audio_tracks: [
          { url: 'https://cdn.test/audio/stored-titled.mp3', title: 'Название из формы', fileName: 'stored-titled.mp3' },
          { url: 'https://cdn.test/audio/stored-legacy.mp3', fileName: 'stored-legacy.mp3' },
          { url: 'https://cdn.test/audio/stored-bare.mp3' },
        ],
        comments_count: 0, ratings_count: 0, average_rating: 0, likes_count: 0, dislikes_count: 0,
        announcement_active: false, announcement_count: 0, radio_recommended: false,
        author_id: '17', author_login: 'author', author_email: 'author@example.test', author_display_name: 'Author',
      }] };
    },
  };
  const work = await createPostgresRepository(pool).getWorkById('101');
  assert.deepEqual(work.audioTracks, [
    { url: 'https://cdn.test/audio/stored-titled.mp3', title: 'Название из формы', fileName: 'stored-titled.mp3' },
    { url: 'https://cdn.test/audio/stored-legacy.mp3', title: 'stored-legacy.mp3', fileName: 'stored-legacy.mp3' },
    { url: 'https://cdn.test/audio/stored-bare.mp3', title: 'Аудиоверсия' },
  ]);
});

test('repository persists audio tracks as JSONB on create and update', async () => {
  const calls = [];
  const tracks = [{ url: 'https://cdn.test/audio/part-1.mp3', title: 'Часть первая', fileName: 'part-1.mp3' }];
  const persisted = [{ url: 'https://cdn.test/audio/part-1.mp3', title: 'Часть первая', fileName: 'part-1.mp3' }];
  const query = async (text, params) => {
    calls.push({ text, params });
    if (/from work_sections where code/.test(text)) return { rows: [{ id: 1 }] };
    if (/insert into works/.test(text)) return { rows: [{ id: '100' }] };
    if (/select id, author_user_id, published_at/.test(text)) return { rows: [{ id: '100', author_user_id: '17', published_at: null }] };
    if (/insert into author_rating_events/.test(text)) return { rows: [{ id: 1 }] };
    return { rows: [] };
  };
  const pool = { query, async connect() { return { query, async release() {} }; } };
  const repo = createPostgresRepository(pool);
  repo.getWorkById = async () => workWithDefaults({ audioTracks: persisted });

  await repo.createWork({ authorUserId: '17', sectionCode: 'poetry', title: 'Audio work', audioTracks: tracks });
  await repo.updateWork({ workId: '100', authorUserId: '17', sectionCode: 'poetry', title: 'Audio work', audioTracks: tracks });

  const writes = calls.filter(({ text }) => /(?:insert into|update) works/.test(text));
  assert.equal(writes.length, 2);
  assert.match(writes[0].text, /audio_tracks/);
  assert.equal(writes[0].params[15], JSON.stringify(persisted));
  assert.match(writes[1].text, /case when \$14::boolean then \$15::jsonb else audio_tracks end/);
  assert.equal(writes[1].params[13], true);
  assert.equal(writes[1].params[14], JSON.stringify(persisted));
});
