import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');

test('reactivated announcements sort as newest and refresh their original timestamp', () => {
  const activate = repository.slice(repository.indexOf('async activateWorkAnnouncement'), repository.indexOf('async listWrittenWorkComments'));
  assert.match(activate, /update work_announcements\s+set activated_by_user_id = \$2,[\s\S]*created_at = now\(\),/);
  const list = repository.slice(repository.indexOf('async listAnnouncedWorks'), repository.indexOf('async listRecentWorkComments'));
  assert.match(list, /order by wa\.created_at desc, wa\.id desc/);
});
