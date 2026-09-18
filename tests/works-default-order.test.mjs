import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('default works order is newest publication first, not most-liked first', async () => {
  const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');
  const listWorks = repository.slice(repository.indexOf('async listWorks('), repository.indexOf('async listWorksForImageGeneration('));

  assert.match(listWorks, /coalesce\(w\.published_at, w\.created_at\) desc, w\.id desc/);
  assert.doesNotMatch(listWorks, /select count\(\*\) from work_likes wl2/);
});
