import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApolloServer } from '../src/createServer.mjs';
import { createPostgresRepository } from '../src/postgresRepository.mjs';

const audio = { audioUrl: '/media/audio/forum-test.mp3', audioFileName: 'тест.mp3' };
const user = { id: '7', role: 'author', login: 'author' };

test('GraphQL passes audio through create and update and requires authentication', async (t) => {
  const calls = [];
  const base = { id:'1', topicId:'2', userId:'7', body:'текст', status:'visible', createdAt:'2026-01-01', updatedAt:'2026-01-01' };
  const repo = {
    async createForumPost(args) { calls.push(args); return { ...base, ...args }; },
    async updateForumPost(args) { calls.push(args); return { ...base, ...args }; },
    async getForumTopic() { return null; },
  };
  const server = createApolloServer({ repo, jwtSecret:'test' }); await server.start(); t.after(() => server.stop());
  const query = 'mutation($url:String,$name:String){createForumPost(topicId:"2",body:"текст",audioUrl:$url,audioFileName:$name){id audioUrl audioFileName}}';
  const execute = (request, currentUser = user) => server.executeOperation(request, { contextValue:{ repo, currentUser, adminUserIds:new Set() } });
  const created = await execute({ query, variables:{url:audio.audioUrl,name:audio.audioFileName} });
  assert.deepEqual(created.body.singleResult.errors, undefined);
  assert.equal(created.body.singleResult.data.createForumPost.audioUrl, audio.audioUrl);
  assert.equal(calls[0].audioFileName, audio.audioFileName);
  const updated = await execute({query:'mutation($url:String,$name:String){updateForumPost(postId:"1",body:"редактировано",audioUrl:$url,audioFileName:$name){audioUrl audioFileName}}',variables:{url:audio.audioUrl,name:audio.audioFileName}});
  assert.deepEqual(updated.body.singleResult.errors, undefined);
  assert.equal(calls[1].audioUrl, audio.audioUrl);
  const denied = await execute({query}, null);
  assert.equal(denied.body.singleResult.errors[0].extensions.code, 'UNAUTHENTICATED');
});

test('Postgres repository persists audio and preserves it on legacy text-only edits', async () => {
  let row = {id:1, topic_id:2, author_user_id:7, body:'old', image_url:null, audio_url:audio.audioUrl, audio_file_name:audio.audioFileName, status:'visible', created_at:'2026-01-01', updated_at:'2026-01-01'};
  const pool = { async query(sql, values) {
    if (/update forum_posts/i.test(sql)) {
      assert.match(sql, /audio_url/i); assert.match(sql, /audio_file_name/i);
      assert.match(sql, /author_user_id/);
      return {rows:[row]};
    }
    if (/from forum_posts fp/i.test(sql)) return {rows:[row]};
    if (/from users/i.test(sql)) return {rows:[]};
    throw new Error('Unexpected SQL: '+sql);
  }};
  const repo = createPostgresRepository(pool);
  repo.getAuthorByUserId = async () => null;
  const result = await repo.updateForumPost({postId:1, authorUserId:7, body:'new'});
  assert.equal(result.audioUrl, audio.audioUrl);
  assert.equal(result.audioFileName, audio.audioFileName);
  const posts = await repo.listForumPosts(2);
  assert.equal(posts[0].audioUrl, audio.audioUrl);
});

test('migration adds nullable audio fields without modifying existing messages', async () => {
  const sql = await readFile(new URL('../migrations/026_forum_post_audio.sql', import.meta.url),'utf8');
  assert.match(sql, /add column if not exists audio_url text/i);
  assert.match(sql, /add column if not exists audio_file_name text/i);
});
