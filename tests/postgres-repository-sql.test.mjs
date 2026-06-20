import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const REPOSITORY_PATH = new URL('../src/postgresRepository.mjs', import.meta.url);

test('registerWorkView ON CONFLICT matches partial unique index on work_views', async () => {
  const source = await readFile(REPOSITORY_PATH, 'utf8');
  assert.match(
    source,
    /insert into work_views \(work_id, viewer_user_id, viewed_at\)[\s\S]*on conflict \(work_id, viewer_user_id\)[\s\S]*where viewer_user_id is not null[\s\S]*do update set viewed_at = excluded\.viewed_at/i,
  );
});
