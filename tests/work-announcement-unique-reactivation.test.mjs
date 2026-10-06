import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');

test('reactivating a revoked announcement reuses its unique work row instead of inserting a duplicate', () => {
  const activate = repository.slice(repository.indexOf('async activateWorkAnnouncement'), repository.indexOf('async listWrittenWorkComments'));
  assert.match(activate, /select id\s+from work_announcements\s+where work_id = \$1\s+and revoked_at is not null/);
  assert.match(activate, /update work_announcements\s+set activated_by_user_id = \$2,[\s\S]*revoked_at = null,[\s\S]*where id = \$1/);
});
