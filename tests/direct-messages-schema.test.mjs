import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SERVER_PATH = new URL('../src/createServer.mjs', import.meta.url);
const REPOSITORY_PATH = new URL('../src/postgresRepository.mjs', import.meta.url);

test('private-message GraphQL API is available to authenticated users', async () => {
  const server = await readFile(SERVER_PATH, 'utf8');
  const repository = await readFile(REPOSITORY_PATH, 'utf8');

  assert.match(server, /type DirectMessage\s*\{/);
  assert.match(server, /myConversations\(limit: Int = 30\): \[Conversation\]!/);
  assert.match(server, /directMessages\(peerUserId: ID!\): \[DirectMessage\]!/);
  assert.match(server, /unreadDirectMessagesCount: Int!/);
  assert.match(server, /sendDirectMessage\(peerUserId: ID!, body: String!\): DirectMessage!/);
  assert.match(repository, /async listConversations\(/);
  assert.match(repository, /async listDirectMessages\(/);
  assert.match(repository, /async sendDirectMessage\(/);
});
