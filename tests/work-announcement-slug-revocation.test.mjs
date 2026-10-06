import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');

test('work loaded by id or slug treats revoked or expired announcements as inactive', () => {
  const getById = repository.slice(repository.indexOf('async getWorkById'), repository.indexOf('async getWorkBySlug'));
  const getBySlug = repository.slice(repository.indexOf('async getWorkBySlug'), repository.indexOf('async createWork'));
  const activePredicate = /exists\(select 1 from work_announcements wa where wa\.work_id = w\.id and wa\.revoked_at is null and wa\.expires_at > now\(\)\) as announcement_active/;
  assert.match(getById, activePredicate);
  assert.match(getBySlug, activePredicate);
});
