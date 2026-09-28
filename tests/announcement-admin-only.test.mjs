import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');

test('announcement activation is restricted to the work owner or an admin', () => {
  assert.match(source, /activateWorkAnnouncement: async[\s\S]*const work = await repo\.getWorkById\(workId\)/);
  assert.match(source, /Only the owner can announce this work/);
  assert.match(source, /repo\.activateWorkAnnouncement\(\{ workId, activatedByUserId: user\.id, isAdmin \}\)/);
});
