import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');
const httpServer = await readFile(new URL('../src/httpServer.mjs', import.meta.url), 'utf8');

test('anonymous work views are deduplicated per browser via a read-marker cookie session', () => {
  assert.match(server, /const ANONYMOUS_READ_COOKIE = 'littop_read_mark'/);
  assert.match(server, /parseReadMarkCookie/);
  assert.match(server, /hasReadMark\(\{ readMark, workId }\)/);
  assert.match(server, /markWorkRead\(\{ readMark, workId }\)/);
  assert.match(server, /buildContext[\s\S]*readMark/);
  const resolver = server.slice(server.indexOf('work: async (_, args'), server.indexOf('workComments:'));
  assert.match(resolver, /hasReadMark\(\{ readMark, workId: work\.id }\)/);
  assert.match(resolver, /anonymousReadMarks\.push\(work\.id\)/);
  assert.match(httpServer, /setAnonymousReadMarkCookie\(\{ req, res, marks: context\.anonymousReadMarks \}\)/);
});

test('read-mark cookie parser decodes ids, ignores garbage and caps the stored list', async () => {
  const mod = await import('../src/createServer.mjs');
  assert.deepEqual(mod.parseReadMarkCookie('littop_read_mark=17%2C18'), ['17', '18']);
  assert.deepEqual(mod.parseReadMarkCookie('littop_read_mark=,'), []);
  assert.deepEqual(mod.parseReadMarkCookie('other=1; littop_read_mark=42'), ['42']);
  assert.deepEqual(mod.parseReadMarkCookie(undefined), []);
});
