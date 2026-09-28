import test from 'node:test';
import assert from 'node:assert/strict';
import { createApolloServer } from '../src/createServer.mjs';

const author = { id: '45', email: 'author@example.com', login: 'author', role: 'author', status: 'active' };
const work = {
  id: '17', title: 'Стихотворение', slug: 'stih-17', status: 'published', sectionCode: 'poetry',
  announcementActive: true, announcementCount: 1, author: { ...author },
};

function makeRepo() {
  return {
    async getWorkById(workId) {
      assert.equal(String(workId), work.id);
      return { ...work };
    },
    async deactivateWorkAnnouncement({ workId, actorUserId }) {
      assert.equal(String(workId), work.id);
      assert.equal(String(actorUserId), author.id);
      return { ...work, announcementActive: false };
    },
    async activateWorkAnnouncement({ workId, activatedByUserId, isAdmin }) {
      assert.equal(String(workId), work.id);
      assert.equal(String(activatedByUserId), author.id);
      assert.equal(isAdmin, false);
      return { ...work, announcementActive: true };
    },
  };
}

async function execute(query) {
  const repo = makeRepo();
  const server = createApolloServer({ repo, jwtSecret: 'test-secret', adminUserIds: new Set() });
  await server.start();
  const result = await server.executeOperation({ query, variables: { workId: work.id } }, {
    contextValue: { repo, jwtSecret: 'test-secret', currentUser: author, adminUserIds: new Set() },
  });
  await server.stop();
  return result.body.singleResult;
}

test('work owner can remove their active announcement', async () => {
  const result = await execute('mutation($workId: ID!) { deactivateWorkAnnouncement(workId: $workId) { id announcementActive } }');
  assert.equal(result.errors, undefined);
  assert.equal(result.data.deactivateWorkAnnouncement.announcementActive, false);
});

test('work owner can activate their published announcement', async () => {
  const result = await execute('mutation($workId: ID!) { activateWorkAnnouncement(workId: $workId) { id announcementActive } }');
  assert.equal(result.errors, undefined);
  assert.equal(result.data.activateWorkAnnouncement.announcementActive, true);
});
