import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const backend = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/023_recommended_work_audio.sql', import.meta.url), 'utf8');

test('only published works with audio can be recommended for radio', () => {
  assert.match(backend, /radioRecommended: Boolean!/);
  assert.match(backend, /recommendWorkAudioForRadio\(workId: ID!\): Work!/);
  assert.match(backend, /radioRecommendedWorks\(limit: Int = 20, offset: Int = 0\): \[Work!]!/);
  assert.match(repository, /radio_recommended = true/);
  assert.match(repository, /audio_url is not null/);
  assert.match(repository, /recommendWorkAudioForRadio/);
  assert.match(migration, /add column if not exists radio_recommended boolean not null default false/i);
});

test('recommendation cannot be enabled for a work without audio', () => {
  assert.match(repository, /Аудиоверсия произведения не добавлена/);
});
