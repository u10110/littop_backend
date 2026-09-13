import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');
test('announcement activation is admin-only on the backend', () => {
  assert.match(source, /activateWorkAnnouncement: async[\s\S]*if \(!isAdminUser\(user, adminUserIds\)\)[\s\S]*Admin only/);
  assert.match(source, /repo\.activateWorkAnnouncement\(\{ workId, activatedByUserId: user\.id, isAdmin: true \}\)/);
});
