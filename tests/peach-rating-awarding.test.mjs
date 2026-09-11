import test from 'node:test';
import assert from 'node:assert/strict';

import { createPostgresRepository } from '../src/postgresRepository.mjs';

// ---------------------------------------------------------------------------
// Тесты начисления персиков и рейтинга. В отличие от main-functionality.test.mjs
// (in-memory fake), здесь мы гоним реальный postgresRepository поверх
// скриптованного fake-pool и проверяем, какие SQL-запросы начисления
// (author_rating_events / peach_transactions / обновления balance) реально уходят.
// ---------------------------------------------------------------------------

function makeFakePool() {
  const calls = [];
  const rules = [];

  async function query(text, params) {
    calls.push({ text, params });
    for (const rule of rules) {
      if (rule.match.test(text)) return rule.respond(params);
    }
    return { rows: [] };
  }

  const pool = {
    query,
    async connect() {
      return { query, async release() {} };
    },
  };

  function on(match, respond) {
    const fn = typeof respond === 'function' ? respond : () => respond;
    rules.unshift({ match, respond: fn });
  }

  // Низкоприоритетные «здоровые» ответы, чтобы начисления реально срабатывали
  // (awardRatingEvent требует rows[0], иначе молча не начисляет рейтинг).
  rules.push({ match: /insert into author_rating_events/, respond: () => ({ rows: [{ id: 1 }] }) });
  rules.push({ match: /insert into peach_transactions/, respond: () => ({ rows: [{ id: 1 }] }) });
  rules.push({ match: /set peach_balance/, respond: () => ({ rows: [{ peach_balance: 1000 }] }) });

  return { pool, calls, on };
}

const ratingEvents = (calls) => calls.filter((c) => c.text.includes('insert into author_rating_events'));
const peachTx = (calls) => calls.filter((c) => c.text.includes('insert into peach_transactions'));
const ratingUpdates = (calls) => calls.filter((c) => c.text.includes('set rating_total'));
const peachUpdates = (calls) => calls.filter((c) => c.text.includes('set peach_balance'));

test('createWork начисляет автору +1 рейтинга (work-created)', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/from work_sections where code/, { rows: [{ id: 1 }] });
  on(/insert into works\s*\(/, { rows: [{ id: 10 }] });
  const repo = createPostgresRepository(pool);

  await repo.createWork({ authorUserId: '9', sectionCode: 'prose', title: 'Test', status: 'published' });

  const events = ratingEvents(calls);
  assert.equal(events.length, 1);
  assert.equal(events[0].params[0], '9'); // userId
  assert.equal(events[0].params[1], 'work-created'); // eventType
  assert.equal(events[0].params[3], 1); // points

  const upd = ratingUpdates(calls);
  assert.equal(upd.length, 1);
  assert.equal(upd[0].params[0], '9');
  assert.equal(upd[0].params[1], 1);
});

test('addWorkComment чужому произведению: автору +5 рейтинга, комментатору +5 персиков', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/author_user_id\s+from works/, { rows: [{ author_user_id: '5' }] });
  on(/insert into work_comments/, { rows: [{ id: 1 }] });
  const repo = createPostgresRepository(pool);

  await repo.addWorkComment({ workId: '1', userId: '7', body: 'отзыв' });

  const events = ratingEvents(calls);
  assert.equal(events.length, 1);
  assert.equal(events[0].params[0], '5'); // автор произведения
  assert.equal(events[0].params[1], 'work-comment-received');
  assert.equal(events[0].params[3], 5);

  const tx = peachTx(calls);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].params[0], '7'); // комментатор
  assert.equal(tx[0].params[1], 5); // amount
  assert.equal(tx[0].params[2], 'work-comment-written'); // kind
});

test('addWorkComment своему произведению: начислений нет', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/author_user_id\s+from works/, { rows: [{ author_user_id: '7' }] });
  on(/insert into work_comments/, { rows: [{ id: 1 }] });
  const repo = createPostgresRepository(pool);

  await repo.addWorkComment({ workId: '1', userId: '7', body: 'свой отзыв' });

  assert.equal(ratingEvents(calls).length, 0);
  assert.equal(peachTx(calls).length, 0);
});

test('registerWorkView: уникальный читатель даёт автору +1 рейтинга', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/author_user_id\s+from works/, { rows: [{ author_user_id: '5' }] });
  on(/insert into work_views/, { rows: [{ id: 1, inserted: true }] });
  const repo = createPostgresRepository(pool);

  await repo.registerWorkView({ workId: '1', viewerUserId: '7' });

  const events = ratingEvents(calls);
  assert.equal(events.length, 1);
  assert.equal(events[0].params[0], '5');
  assert.equal(events[0].params[1], 'unique-work-reader');
  assert.equal(events[0].params[3], 1);
});

test('updateUserProfile: first-avatar/city/birth-date по +10 рейтинга', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/select avatar_url, city, birth_date/, { rows: [{ avatar_url: null, city: null, birth_date: null }] });
  const repo = createPostgresRepository(pool);

  await repo.updateUserProfile({
    userId: '9',
    displayName: 'Автор',
    avatarUrl: 'https://x/avatar.png',
    city: 'Москва',
    birthDate: '2000-01-01',
  });

  const events = ratingEvents(calls);
  assert.equal(events.length, 3);
  const types = events.map((e) => e.params[1]).sort();
  assert.deepEqual(types, ['first-avatar', 'first-birth-date', 'first-city']);
  for (const e of events) {
    assert.equal(e.params[0], '9');
    assert.equal(e.params[3], 10);
  }
});

test('grantPeachesByLogin (админ): applyPeachDelta с kind=admin-grant', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/where login = \$1/, { rows: [{ id: '9' }] });
  const repo = createPostgresRepository(pool);

  await repo.grantPeachesByLogin({ login: 'somebody', amount: 100, grantedByUserId: '1' });

  const tx = peachTx(calls);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].params[0], '9');
  assert.equal(tx[0].params[1], 100);
  assert.equal(tx[0].params[2], 'admin-grant');

  const upd = peachUpdates(calls);
  assert.equal(upd.length, 1);
  assert.equal(upd[0].params[0], 100);
  assert.equal(upd[0].params[1], '9');
});

test('purchaseAudioUploadPack: −100 персиков', async () => {
  const { pool, calls } = makeFakePool();
  const repo = createPostgresRepository(pool);

  await repo.purchaseAudioUploadPack({ userId: '9' });

  const tx = peachTx(calls);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].params[0], '9');
  assert.equal(tx[0].params[1], -100);
  assert.equal(tx[0].params[2], 'audio-pack-purchase');
});

test('purchaseAudioUploadPack: при нехватке персиков — ошибка', async () => {
  const { pool, on } = makeFakePool();
  on(/set peach_balance/, { rows: [] }); // requireSufficientBalance → нет строки → нехватка
  const repo = createPostgresRepository(pool);

  await assert.rejects(
    () => repo.purchaseAudioUploadPack({ userId: '9' }),
    /Недостаточно персиков/,
  );
});

test('createAuthorReviewRequest: списывает −100 персиков (requireSufficientBalance)', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/insert into author_review_requests/, {
    rows: [{ id: 1, requester_user_id: '7', work_id: null, title: 't', message: null, status: 'pending', cost_peaches: 100, created_at: new Date(), updated_at: new Date() }],
  });
  const repo = createPostgresRepository(pool);

  await repo.createAuthorReviewRequest({ requesterUserId: '7', title: 'Прошу рецензию' });

  const tx = peachTx(calls);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].params[0], '7');
  assert.equal(tx[0].params[1], -100);
  assert.equal(tx[0].params[2], 'admin-review-request');
});

test('activateWorkAnnouncement (не-админ): −50 персиков, автору +50 рейтинга', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/author_user_id, announcement_active\s+from works/, { rows: [{ id: '1', author_user_id: '5', announcement_active: false }] });
  on(/from work_announcements\s+where work_id/, { rows: [] });
  on(/select count\(\*\)::int as cnt from work_announcements/, { rows: [{ cnt: 0 }] });
  on(/insert into work_announcements/, { rows: [{ id: 1 }] });
  const repo = createPostgresRepository(pool);

  await repo.activateWorkAnnouncement({ workId: '1', activatedByUserId: '7', isAdmin: false });

  const tx = peachTx(calls);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].params[0], '7');
  assert.equal(tx[0].params[1], -50);
  assert.equal(tx[0].params[2], 'work_announcement');

  const events = ratingEvents(calls);
  assert.equal(events.length, 1);
  assert.equal(events[0].params[0], '5'); // автор
  assert.equal(events[0].params[1], 'work_announcement');
  assert.equal(events[0].params[3], 50);
});

test('createForumPost: автору поста +10, автору темы +5 рейтинга', async () => {
  const { pool, calls, on } = makeFakePool();
  on(/author_user_id\s+from forum_topics/, { rows: [{ author_user_id: '5' }] });
  on(/insert into forum_posts/, { rows: [{ id: 1, topic_id: '1', author_user_id: '7', parent_post_id: null, body: 'b', image_url: null, created_at: new Date(), updated_at: new Date(), status: 'visible' }] });
  const repo = createPostgresRepository(pool);

  await repo.createForumPost({ topicId: '1', authorUserId: '7', body: 'пост' });

  const events = ratingEvents(calls);
  assert.equal(events.length, 2);

  const participation = events.find((e) => e.params[1] === 'forum-participation-halfyear');
  assert.ok(participation);
  assert.equal(participation.params[0], '7');
  assert.equal(participation.params[3], 10);

  const received = events.find((e) => e.params[1] === 'forum-message-received');
  assert.ok(received);
  assert.equal(received.params[0], '5');
  assert.equal(received.params[3], 5);
});
