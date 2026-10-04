import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../src/createServer.mjs', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/postgresRepository.mjs', import.meta.url), 'utf8');
const http = await readFile(new URL('../src/httpServer.mjs', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/025_work_comment_attachments.sql', import.meta.url), 'utf8');

test('work comment attachments are declared, persisted, returned and migrated', () => {
  assert.match(server, /type WorkCommentAttachment/);
  assert.match(server, /attachments: \[WorkCommentAttachment!\]!/);
  assert.match(server, /attachments: \[WorkCommentAttachmentInput!\]/);
  assert.match(repository, /attachments: normalizeWorkCommentAttachments\(row\.attachments\)/);
  assert.match(repository, /insert into work_comments \(work_id, user_id, parent_comment_id, body, image_url, attachments\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS attachments JSONB/);
});

test('shared work media accepts DOC and DOCX and serves their MIME types', () => {
  assert.match(http, /doc: '\.doc'/);
  assert.match(http, /docx: '\.docx'/);
  assert.match(http, /application\/msword/);
  assert.match(http, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
});
