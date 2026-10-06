import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');

test('work loaded by slug treats revoked announcements as inactive', () => {
  const getBySlug = repository.slice(repository.indexOf('async getWorkBySlug'), repository.indexOf('async createWork'));
  assert.match(getBySlug, /exists\(select 1 from work_announcements wa where wa\.work_id = w\.id and wa\.revoked_at is null\) as announcement_active/);
});
