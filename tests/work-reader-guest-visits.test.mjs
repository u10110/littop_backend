import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');

test('work visits record guests in totals but never include them in the registered reader roster', () => {
  assert.match(server, /const viewerUserId = currentUser\?\.id \?\? null;[\s\S]*?registerWorkView\(\{ workId: work\.id, viewerUserId \}\)/);
  assert.match(repository, /if \(!workId\) return null;/);
  assert.match(repository, /if \(viewerUserId != null\) \{/);
  assert.match(repository, /insert into work_page_views \(work_id, author_user_id, viewer_user_id, viewed_at\)[\s\S]*?values \(\$1, \$2, \$3, now\(\)\)/);
  const readerRoster = repository.slice(repository.indexOf('async listWorkReaders'), repository.indexOf('async listAuthorPageVisitorsByWork'));
  assert.match(readerRoster, /and wpv\.viewer_user_id is not null/);
  assert.match(readerRoster, /join users u on u\.id = latest\.viewer_user_id/);
});
