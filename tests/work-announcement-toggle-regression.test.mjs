import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');
const server = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');

test('reactivating an announcement ignores revoked historical rows', () => {
  const activate = repository.slice(repository.indexOf('async activateWorkAnnouncement'), repository.indexOf('async listWrittenWorkComments'));
  assert.match(activate, /where work_id = \$1\s+and revoked_at is null/);
  assert.match(server, /deactivateWorkAnnouncement[\s\S]*repo\.deactivateWorkAnnouncement/);
  assert.match(server, /activateWorkAnnouncement[\s\S]*repo\.activateWorkAnnouncement/);
});
