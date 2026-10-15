import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/httpServer.mjs', import.meta.url), 'utf8');

test('work-image generation is available to its author and administrators only', () => {
  const handler = source.slice(
    source.indexOf('async function handleAdminWorkImageGenerationRequest'),
    source.indexOf('async function handleWorkMediaUploadRequest'),
  );
  assert.match(handler, /if \(!user\) \{[\s\S]*?sendJson\(res, 401/);
  assert.match(handler, /const isAdmin = user\.role === 'admin' \|\| adminUserIds\?\.has\(String\(user\.id\)\)/);
  assert.match(handler, /const isOwner = String\(work\.author\?\.id \?\? work\.authorUserId \?\? ''\) === String\(user\.id\)/);
  assert.match(handler, /if \(!isAdmin && !isOwner\) \{[\s\S]*?sendJson\(res, 403/);
  assert.match(handler, /workImageGenerationInFlight/);
});
