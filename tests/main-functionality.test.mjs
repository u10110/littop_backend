import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { hashPassword } from '../src/auth.mjs';

// ---------------------------------------------------------------------------
// Полноценный in-memory fake-репозиторий: записывает все вызовы (для проверки
// проброса аргументов) и возвращает осмысленные значения по умолчанию.
// ---------------------------------------------------------------------------
function makeFakeRepo() {
  const calls = {};
  const record = (name) => (...args) => {
    (calls[name] ||= []).push(args);
    return undefined;
  };

  let userId = 1;
  let workId = 100;
  let topicId = 500;
  const users = [];
  const works = [];
  const topics = new Map();

  const now = () => new Date().toISOString();

  return {
    calls,

    async ping() {
      return true;
    },

    async createUser({ email, login, passwordHash, displayName, role = 'author', status = 'active' }) {
      const user = {
        id: userId++,
        email,
        login,
        passwordHash,
        role,
        status,
        registeredAt: now(),
        lastLoginAt: null,
        lastSeenAt: now(),
        deletedAt: null,
        createdAt: now(),
        updatedAt: now(),
        profile: {
          displayName,
          bio: null,
          avatarUrl: null,
          coverImageUrl: null,
          coverImagePositionX: 50,
          coverImagePositionY: 50,
          coverImageScale: 1,
          profileLinks: [],
          city: null,
          websiteUrl: null,
          birthDate: null,
          ratingTotal: 0,
          worksCountCached: 0,
          isClassic: false,
          isMemorialPage: false,
          isFeatured: false,
          peachBalance: 0,
          audioUploadSlots: 0,
        },
      };
      users.push(user);
      return user;
    },

    async getUserById(id) {
      return users.find((u) => String(u.id) === String(id)) ?? null;
    },
    async getUserByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async getUserByIdentifier(id) {
      return users.find((u) => u.email === id || u.login === id) ?? null;
    },
    async getUserByIdentifierIncludingDeleted(id) {
      return users.find((u) => u.email === id || u.login === id) ?? null;
    },
    async findUserByEmailOrLogin(email, login) {
      return users.find((u) => u.email === email || u.login === login) ?? null;
    },
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },

    async updateUserProfile({ userId, displayName, bio = null, city = null, websiteUrl = null }) {
      const user = users.find((u) => String(u.id) === String(userId));
      if (!user) return null;
      user.profile = { ...user.profile, displayName, bio, city, websiteUrl };
      return user;
    },
    async updateAuthorPageFlags(args) {
      record('updateAuthorPageFlags')(args);
      return { id: args.authorId, isClassic: args.isClassic };
    },
    async closeUserAccount({ userId }) {
      record('closeUserAccount')({ userId });
      return true;
    },
    async reopenUserAccount({ userId }) {
      record('reopenUserAccount')({ userId });
      return this.getUserById(userId);
    },

    async listAuthors(args = {}) {
      record('listAuthors')(args);
      return users.map((u) => ({ id: u.id, login: u.login, email: u.email, displayName: u.profile.displayName }));
    },
    async listOnlineAuthors(args = {}) {
      record('listOnlineAuthors')(args);
      return [];
    },
    async listTodayVisitors(args = {}) {
      record('listTodayVisitors')(args);
      return [];
    },
    async listBirthdayAuthors(args = {}) {
      record('listBirthdayAuthors')(args);
      return [];
    },
    async getAuthor(args = {}) {
      record('getAuthor')(args);
      return null;
    },
    async getAuthorByUserId(userId) {
      record('getAuthorByUserId')(userId);
      const u = users.find((x) => String(x.id) === String(userId));
      return u ? { id: u.id, login: u.login, displayName: u.profile.displayName } : null;
    },
    async getAuthorProfileLinks(id) {
      return [];
    },
    async canReceivePrivateMessages(id) {
      return true;
    },

    async createWork({ authorUserId, sectionCode, title, summary = null, body = null, excerpt = null, status = 'published', projectFormat = null, genreSlug = null }) {
      const work = {
        id: workId++,
        title,
        slug: `work-${workId}`,
        summary,
        body,
        excerpt,
        status,
        sectionCode,
        genreSlug,
        projectFormat,
        authorUserId,
        author: users.find((u) => String(u.id) === String(authorUserId)) ?? null,
        commentsCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        likesCount: 0,
        dislikesCount: 0,
        publishedAt: status === 'published' ? now() : null,
        createdAt: now(),
        updatedAt: now(),
      };
      works.push(work);
      return work;
    },
    async getWorkById(id) {
      return works.find((w) => String(w.id) === String(id)) ?? null;
    },
    async getWorkBySlug(slug) {
      return works.find((w) => w.slug === slug) ?? null;
    },
    async listWorks(args = {}) {
      record('listWorks')(args);
      return works;
    },
    async listWorkGenres(args = {}) {
      record('listWorkGenres')(args);
      return [];
    },
    async registerWorkView(args) {
      record('registerWorkView')(args);
    },
    async hasUserLikedWork(args) {
      record('hasUserLikedWork')(args);
      return false;
    },
    async hasUserDislikedWork(args) {
      record('hasUserDislikedWork')(args);
      return false;
    },
    async hasWorkAnnouncement(args) {
      record('hasWorkAnnouncement')(args);
      return false;
    },

    async toggleWorkLike({ workId, userId }) {
      record('toggleWorkLike')({ workId, userId });
      const w = works.find((x) => String(x.id) === String(workId));
      return w ?? { id: workId };
    },
    async toggleWorkDislike({ workId, userId }) {
      record('toggleWorkDislike')({ workId, userId });
      return { id: workId };
    },
    async upsertWorkRating({ workId, userId, rating }) {
      record('upsertWorkRating')({ workId, userId, rating });
      return { id: 1, workId, userId, rating, createdAt: now(), updatedAt: now() };
    },
    async addWorkComment({ workId, userId, body, parentCommentId = null, imageUrl = null }) {
      record('addWorkComment')({ workId, userId, body, parentCommentId, imageUrl });
      return { id: 1, workId, userId, body, parentCommentId, imageUrl, status: 'visible', createdAt: now(), updatedAt: now() };
    },
    async updateWorkComment(args) {
      record('updateWorkComment')(args);
      return { id: args.commentId, body: args.body };
    },
    async softDeleteWorkComment(args) {
      record('softDeleteWorkComment')(args);
      return { id: args.commentId, status: 'deleted' };
    },
    async toggleWorkCommentLike({ commentId, userId }) {
      record('toggleWorkCommentLike')({ commentId, userId });
      return { id: commentId };
    },
    async hasUserLikedWorkComment(args) {
      record('hasUserLikedWorkComment')(args);
      return false;
    },
    async listWorkComments(args = {}) {
      record('listWorkComments')(args);
      return [];
    },
    async listWorkViewers(args = {}) {
      record('listWorkViewers')(args);
      return [];
    },
    async listWorkReaders(args = {}) {
      record('listWorkReaders')(args);
      return { totalViews: 0, lockedViews: 0, batchSize: 0, viewers: [] };
    },
    async listAuthorPageVisitorsByWork(args = {}) {
      record('listAuthorPageVisitorsByWork')(args);
      return { totalViews: 0, lockedViews: 0, batchSize: 0, visitors: [] };
    },
    async listWorkLikers(args = {}) {
      record('listWorkLikers')(args);
      return [];
    },
    async listWorkCommentLikers(args = {}) {
      record('listWorkCommentLikers')(args);
      return [];
    },
    async listWrittenWorkComments(args = {}) {
      record('listWrittenWorkComments')(args);
      return [];
    },
    async listReceivedWorkComments(args = {}) {
      record('listReceivedWorkComments')(args);
      return [];
    },
    async listRecentWorkComments(args = {}) {
      record('listRecentWorkComments')(args);
      return [];
    },

    async listForumSections() {
      record('listForumSections')();
      return [];
    },
    async listForumTopics(args = {}) {
      record('listForumTopics')(args);
      return [];
    },
    async getForumTopic(args = {}) {
      record('getForumTopic')(args);
      const id = args.id;
      if (!topics.has(id)) {
        topics.set(id, {
          id,
          title: 'Тема',
          slug: `topic-${id}`,
          body: 'body',
          sectionSlug: 'general',
          repliesCount: 0,
          viewsCount: 0,
          status: 'open',
          featuredMain: false,
          authorUserId: null,
          author: null,
        });
      }
      return topics.get(id);
    },
    async createForumTopic(args) {
      record('createForumTopic')(args);
      return { id: topicId++, ...args, repliesCount: 0, viewsCount: 0, status: 'open' };
    },
    async updateForumTopic(args) {
      record('updateForumTopic')(args);
      return { id: args.topicId };
    },
    async softDeleteForumTopic(args) {
      record('softDeleteForumTopic')(args);
      return { id: args.topicId, status: 'deleted' };
    },
    async setForumTopicStatus({ topicId, status }) {
      record('setForumTopicStatus')({ topicId, status });
      return { id: topicId, status };
    },
    async incrementForumTopicViews({ topicId }) {
      record('incrementForumTopicViews')({ topicId });
      return null; // по умолчанию «тема не найдена» → тест на NOT_FOUND
    },
    async createForumPost(args) {
      record('createForumPost')(args);
      return { id: 1, topicId: args.topicId, userId: args.authorUserId, body: args.body, parentPostId: args.parentPostId ?? null, status: 'visible', createdAt: now(), updatedAt: now() };
    },
    async updateForumPost(args) {
      record('updateForumPost')(args);
      return { id: args.postId, body: args.body };
    },
    async softDeleteForumPost(args) {
      record('softDeleteForumPost')(args);
      return { id: args.postId, status: 'deleted' };
    },
    async listForumPosts(topicId) {
      record('listForumPosts')(topicId);
      return [];
    },

    async listPrivateDialogs(args = {}) {
      record('listPrivateDialogs')(args);
      return [];
    },
    async listPrivateMessages(args = {}) {
      record('listPrivateMessages')(args);
      return [];
    },
    async sendPrivateMessage(args) {
      record('sendPrivateMessage')(args);
      return { id: 1, senderUserId: args.senderUserId, recipientUserId: args.recipientUserId ?? null, body: args.body, status: 'sent', createdAt: now(), updatedAt: now(), readAt: null };
    },
    async markPrivateMessagesRead(args) {
      record('markPrivateMessagesRead')(args);
      return 1;
    },
    async countUnreadDirectMessages({ userId }) {
      record('countUnreadDirectMessages')({ userId });
      return 0;
    },

    async listMyWorkGroups({ authorUserId }) {
      record('listMyWorkGroups')({ authorUserId });
      return [];
    },
    async createMyWorkGroup(args) {
      record('createMyWorkGroup')(args);
      return { id: 1, ...args, position: 0, isCollapsed: false, works: [] };
    },
    async updateMyWorkGroup(args) {
      record('updateMyWorkGroup')(args);
      return { id: args.groupId };
    },
    async deleteMyWorkGroup(args) {
      record('deleteMyWorkGroup')(args);
      return true;
    },
    async reorderMyWorkGroups(args) {
      record('reorderMyWorkGroups')(args);
      return [];
    },
    async setMyWorkGroupItems(args) {
      record('setMyWorkGroupItems')(args);
      return { id: args.groupId, works: [] };
    },
    async setMyWorkGroupCollapsed(args) {
      record('setMyWorkGroupCollapsed')(args);
      return { id: args.groupId };
    },

    async listContests(args = {}) {
      record('listContests')(args);
      return [];
    },
    async listRadioTracks(args = {}) {
      record('listRadioTracks')(args);
      return [];
    },
    async listRadioTracksByCreator(args) {
      record('listRadioTracksByCreator')(args);
      return [];
    },
    async updateRadioTrack(args) {
      record('updateRadioTrack')(args);
      return { id: args.id, title: args.title, authorName: args.authorName };
    },
    async deleteRadioTrack(args) {
      record('deleteRadioTrack')(args);
      return { id: args.id };
    },
    async listSiteSettings() {
      record('listSiteSettings')();
      return [];
    },
    async upsertSiteSetting({ key, value }) {
      record('upsertSiteSetting')({ key, value });
      return { key, value };
    },
    async listAnnouncedWorks(args = {}) {
      record('listAnnouncedWorks')(args);
      return [];
    },
    async activateWorkAnnouncement(args) {
      record('activateWorkAnnouncement')(args);
      return { id: args.workId };
    },
    async deactivateWorkAnnouncement(args) {
      record('deactivateWorkAnnouncement')(args);
      return { id: args.workId };
    },
    async adminDeactivateWorkAnnouncement(args) {
      record('adminDeactivateWorkAnnouncement')(args);
      return { id: args.workId };
    },
    async touchUserPresence(userId) {
      record('touchUserPresence')(userId);
      const u = users.find((x) => String(x.id) === String(userId));
      return u;
    },
  };
}

async function exec(server, repo, { query, variables, currentUser = null, adminUserIds = new Set() } = {}) {
  const result = await server.executeOperation(
    { query, variables },
    { contextValue: { repo, jwtSecret: 'test-secret', currentUser, authHeader: '', adminUserIds } },
  );
  if (result.body.kind !== 'single') {
    throw new Error('expected single result');
  }
  return result.body.singleResult;
}

function errorsOf(result) {
  return result.errors ?? [];
}

async function startServer(repo) {
  const server = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await server.start();
  return server;
}

// ---------------------------------------------------------------------------
// Произведения: каталог и выборка
// ---------------------------------------------------------------------------
test('works query пробрасывает фильтры в repo.listWorks', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `query { works(sectionCode: "poetry", genreSlug: "aphorisms", search: "зима", authorId: "7", createdToday: true, sort: "RATING", limit: 5) { id title } }`,
  });
  assert.equal(errorsOf(result).length, 0);
  const args = repo.calls.listWorks[0][0];
  assert.equal(args.sectionCode, 'poetry');
  assert.equal(args.genreSlug, 'aphorisms');
  assert.equal(args.search, 'зима');
  assert.equal(args.authorId, '7');
  assert.equal(args.createdToday, true);
  assert.equal(args.sort, 'RATING');
  assert.equal(args.limit, 5);
  await server.stop();
});

test('work(id) возвращает опубликованное произведение', async () => {
  const repo = makeFakeRepo();
  const author = await repo.createUser({ email: 'a@x.ru', login: 'author', passwordHash: 'h', displayName: 'Автор' });
  const work = await repo.createWork({ authorUserId: author.id, sectionCode: 'poetry', title: 'Стих', status: 'published' });
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `query($id: ID!) { work(id: $id) { id title status } }`,
    variables: { id: String(work.id) },
  });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(result.data.work.title, 'Стих');
  await server.stop();
});

test('work(id) скрывает черновик от постороннего, но отдаёт автору', async () => {
  const repo = makeFakeRepo();
  const author = await repo.createUser({ email: 'a@x.ru', login: 'author', passwordHash: 'h', displayName: 'Автор' });
  const stranger = await repo.createUser({ email: 's@x.ru', login: 'stranger', passwordHash: 'h', displayName: 'Чужой' });
  const draft = await repo.createWork({ authorUserId: author.id, sectionCode: 'poetry', title: 'Черновик', status: 'draft' });
  const server = await startServer(repo);

  const asStranger = await exec(server, repo, {
    query: `query($id: ID!) { work(id: $id) { id } }`,
    variables: { id: String(draft.id) },
    currentUser: stranger,
  });
  assert.equal(asStranger.data.work, null);

  const asAuthor = await exec(server, repo, {
    query: `query($id: ID!) { work(id: $id) { id title status } }`,
    variables: { id: String(draft.id) },
    currentUser: author,
  });
  assert.equal(asAuthor.data.work.title, 'Черновик');
  await server.stop();
});

test('work(id) регистрирует просмотр для авторизованного не-автора', async () => {
  const repo = makeFakeRepo();
  const author = await repo.createUser({ email: 'a@x.ru', login: 'author', passwordHash: 'h', displayName: 'Автор' });
  const reader = await repo.createUser({ email: 'r@x.ru', login: 'reader', passwordHash: 'h', displayName: 'Читатель' });
  const work = await repo.createWork({ authorUserId: author.id, sectionCode: 'poetry', title: 'Стих', status: 'published' });
  const server = await startServer(repo);
  await exec(server, repo, {
    query: `query($id: ID!) { work(id: $id) { id } }`,
    variables: { id: String(work.id) },
    currentUser: reader,
  });
  assert.ok(repo.calls.registerWorkView);
  assert.equal(repo.calls.registerWorkView[0][0].workId, work.id);
  assert.equal(repo.calls.registerWorkView[0][0].viewerUserId, reader.id);
  await server.stop();
});

// ---------------------------------------------------------------------------
// Произведения: лайки / дизлайки / рейтинг / комментарии
// ---------------------------------------------------------------------------
test('toggleWorkLike требует авторизацию', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `mutation { toggleWorkLike(workId: "100") { id } }`, currentUser: null });
  assert.equal(errorsOf(result)[0].extensions.code, 'UNAUTHENTICATED');
  await server.stop();
});

test('toggleWorkLike пробрасывает workId и userId', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `mutation { toggleWorkLike(workId: "100") { id } }`, currentUser: user });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(repo.calls.toggleWorkLike[0][0].workId, '100');
  assert.equal(repo.calls.toggleWorkLike[0][0].userId, user.id);
  await server.stop();
});

test('toggleWorkDislike требует авторизацию и пробрасывает аргументы', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `mutation { toggleWorkDislike(workId: "100") { id } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  const ok = await exec(server, repo, { query: `mutation { toggleWorkDislike(workId: "100") { id } }`, currentUser: user });
  assert.equal(errorsOf(ok).length, 0);
  assert.equal(repo.calls.toggleWorkDislike[0][0].userId, user.id);
  await server.stop();
});

test('rateWork требует авторизацию и сохраняет рейтинг', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($workId: ID!, $rating: Int!) { rateWork(workId: $workId, rating: $rating) { workId userId rating } }`,
    variables: { workId: '100', rating: 5 },
    currentUser: user,
  });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(result.data.rateWork.rating, 5);
  assert.equal(repo.calls.upsertWorkRating[0][0].rating, 5);
  assert.equal(repo.calls.upsertWorkRating[0][0].userId, user.id);
  await server.stop();
});

test('addWorkComment требует авторизацию и сохраняет комментарий', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `mutation { addWorkComment(workId: "100", body: "x") { id } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  const result = await exec(server, repo, {
    query: `mutation { addWorkComment(workId: "100", body: "Отзыв", parentCommentId: "9") { id body } }`,
    currentUser: user,
  });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(result.data.addWorkComment.body, 'Отзыв');
  assert.equal(repo.calls.addWorkComment[0][0].workId, '100');
  assert.equal(repo.calls.addWorkComment[0][0].parentCommentId, '9');
  await server.stop();
});

test('deleteWorkComment требует авторизацию и пробрасывает canManageAll', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `mutation { deleteWorkComment(commentId: "5") { id } }`, currentUser: user });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(repo.calls.softDeleteWorkComment[0][0].commentId, '5');
  assert.equal(repo.calls.softDeleteWorkComment[0][0].canManageAll, false);
  await server.stop();
});

test('toggleWorkCommentLike требует авторизацию', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `mutation { toggleWorkCommentLike(commentId: "5") { id } }`, currentUser: user });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(repo.calls.toggleWorkCommentLike[0][0].commentId, '5');
  await server.stop();
});

// ---------------------------------------------------------------------------
// Авторы
// ---------------------------------------------------------------------------
test('authors query пробрасывает фильтры и сортировку', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `query { authors(search: "иван", classicsOnly: true, memorialOnly: true, sort: ALPHABETICAL, limit: 10) { id } }`,
  });
  assert.equal(errorsOf(result).length, 0);
  const args = repo.calls.listAuthors[0][0];
  assert.equal(args.search, 'иван');
  assert.equal(args.classicsOnly, true);
  assert.equal(args.memorialOnly, true);
  assert.equal(args.sort, 'ALPHABETICAL');
  assert.equal(args.limit, 10);
  await server.stop();
});

test('author query пробрасывает id и login', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { author(id: "3") { id } }` });
  assert.equal(repo.calls.getAuthor[0][0].id, '3');
  await exec(server, repo, { query: `query { author(login: "poet") { id } }` });
  assert.equal(repo.calls.getAuthor[1][0].login, 'poet');
  await server.stop();
});

test('onlineAuthors / birthdayAuthors / todayVisitors пробрасывают limit', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { onlineAuthors(limit: 5) { id } birthdayAuthors(limit: 3) { id } todayVisitors(limit: 7) { id } }` });
  assert.equal(repo.calls.listOnlineAuthors[0][0].limit, 5);
  assert.equal(repo.calls.listBirthdayAuthors[0][0].limit, 3);
  assert.equal(repo.calls.listTodayVisitors[0][0].limit, 7);
  await server.stop();
});

// ---------------------------------------------------------------------------
// Форум
// ---------------------------------------------------------------------------
test('forumSections возвращает разделы', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `query { forumSections { id } }` });
  assert.equal(errorsOf(result).length, 0);
  assert.ok(repo.calls.listForumSections);
  await server.stop();
});

test('forumTopics и forumTopic пробрасывают аргументы', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { forumTopics(sectionSlug: "general", tag: "news", featuredMain: true, limit: 15) { id } }` });
  const args = repo.calls.listForumTopics[0][0];
  assert.equal(args.sectionSlug, 'general');
  assert.equal(args.tag, 'news');
  assert.equal(args.featuredMain, true);
  assert.equal(args.limit, 15);

  await exec(server, repo, { query: `query { forumTopic(id: "500") { id } }` });
  assert.equal(repo.calls.getForumTopic[0][0].id, '500');
  await server.stop();
});

test('createForumTopic: обычный раздел разрешён, колонка редактора — только редактору/админу', async () => {
  const repo = makeFakeRepo();
  const author = await repo.createUser({ email: 'a@x.ru', login: 'author', passwordHash: 'h', displayName: 'Автор' });
  const editor = await repo.createUser({ email: 'e@x.ru', login: 'editor', passwordHash: 'h', displayName: 'Редактор', role: 'editor' });
  const server = await startServer(repo);

  const regular = await exec(server, repo, {
    query: `mutation { createForumTopic(input: { sectionSlug: "general", title: "Тема", body: "body" }) { id title } }`,
    currentUser: author,
  });
  assert.equal(errorsOf(regular).length, 0);
  assert.equal(repo.calls.createForumTopic[0][0].authorUserId, author.id);

  const forbidden = await exec(server, repo, {
    query: `mutation { createForumTopic(input: { sectionSlug: "editor-column", title: "Тема", body: "body" }) { id } }`,
    currentUser: author,
  });
  assert.equal(errorsOf(forbidden)[0].extensions.code, 'FORBIDDEN');

  const editorial = await exec(server, repo, {
    query: `mutation { createForumTopic(input: { sectionSlug: "editor-column", title: "Колонка", body: "body" }) { id } }`,
    currentUser: editor,
  });
  assert.equal(errorsOf(editorial).length, 0);
  await server.stop();
});

test('createForumPost требует авторизацию и пробрасывает аргументы', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `mutation { createForumPost(topicId: "500", body: "x") { id } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  const ok = await exec(server, repo, { query: `mutation { createForumPost(topicId: "500", body: "Ответ") { id body } }`, currentUser: user });
  assert.equal(errorsOf(ok).length, 0);
  assert.equal(repo.calls.createForumPost[0][0].topicId, '500');
  assert.equal(repo.calls.createForumPost[0][0].authorUserId, user.id);
  await server.stop();
});

test('closeForumTopic: автор может, посторонний не-админ — нет, админ может', async () => {
  const repo = makeFakeRepo();
  const owner = await repo.createUser({ email: 'o@x.ru', login: 'owner', passwordHash: 'h', displayName: 'Владелец' });
  const other = await repo.createUser({ email: 't@x.ru', login: 'other', passwordHash: 'h', displayName: 'Другой' });
  const admin = await repo.createUser({ email: 'adm@x.ru', login: 'admin', passwordHash: 'h', displayName: 'Админ', role: 'admin' });
  const topic = await repo.getForumTopic({ id: '500' });
  topic.author = { id: owner.id };
  topic.authorUserId = owner.id;
  const server = await startServer(repo);

  const byOwner = await exec(server, repo, { query: `mutation { closeForumTopic(topicId: "500") { id status } }`, currentUser: owner });
  assert.equal(errorsOf(byOwner).length, 0);
  assert.equal(repo.calls.setForumTopicStatus[0][0].status, 'closed');

  const byOther = await exec(server, repo, { query: `mutation { closeForumTopic(topicId: "500") { id } }`, currentUser: other });
  assert.equal(errorsOf(byOther)[0].extensions.code, 'FORBIDDEN');

  const byAdmin = await exec(server, repo, { query: `mutation { closeForumTopic(topicId: "500") { id status } }`, currentUser: admin });
  assert.equal(errorsOf(byAdmin).length, 0);
  await server.stop();
});

test('incrementForumTopicViews отдаёт NOT_FOUND, если темы нет', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, { query: `mutation { incrementForumTopicViews(topicId: "999") { id } }` });
  assert.equal(errorsOf(result)[0].extensions.code, 'NOT_FOUND');
  await server.stop();
});

// ---------------------------------------------------------------------------
// Личные сообщения
// ---------------------------------------------------------------------------
test('privateDialogs / privateMessages требуют авторизацию', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const anon = await exec(server, repo, { query: `query { privateDialogs { peerUserId } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');
  await server.stop();
});

test('privateDialogs и privateMessages пробрасывают userId', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { privateDialogs { peerUserId } privateMessages(withUserId: "7") { id } }`, currentUser: user });
  assert.equal(repo.calls.listPrivateDialogs[0][0].userId, user.id);
  assert.equal(repo.calls.listPrivateMessages[0][0].withUserId, '7');
  await server.stop();
});

test('sendPrivateMessage требует авторизацию и пробрасывает аргументы', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation { sendPrivateMessage(recipientUserId: "9", body: "Привет") { id body } }`,
    currentUser: user,
  });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(repo.calls.sendPrivateMessage[0][0].senderUserId, user.id);
  assert.equal(repo.calls.sendPrivateMessage[0][0].recipientUserId, '9');
  await server.stop();
});

test('markPrivateMessagesRead и unreadDirectMessagesCount требуют авторизацию', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `query { unreadDirectMessagesCount }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  await exec(server, repo, { query: `mutation { markPrivateMessagesRead(withUserId: "9") }`, currentUser: user });
  assert.equal(repo.calls.markPrivateMessagesRead[0][0].userId, user.id);
  await server.stop();
});

// ---------------------------------------------------------------------------
// Группы произведений автора
// ---------------------------------------------------------------------------
test('myWorkGroups требует авторизацию и пробрасывает authorUserId', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `query { myWorkGroups { id } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  await exec(server, repo, { query: `query { myWorkGroups { id } }`, currentUser: user });
  assert.equal(repo.calls.listMyWorkGroups[0][0].authorUserId, user.id);
  await server.stop();
});

test('createMyWorkGroup и setMyWorkGroupItems пробрасывают аргументы', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  await exec(server, repo, { query: `mutation { createMyWorkGroup(input: { name: "Избранное", description: "d" }) { id name } }`, currentUser: user });
  assert.equal(repo.calls.createMyWorkGroup[0][0].authorUserId, user.id);
  assert.equal(repo.calls.createMyWorkGroup[0][0].name, 'Избранное');

  await exec(server, repo, { query: `mutation { setMyWorkGroupItems(groupId: "1", workIds: ["100", "101"]) { id } }`, currentUser: user });
  assert.equal(repo.calls.setMyWorkGroupItems[0][0].workIds.length, 2);
  await server.stop();
});

// ---------------------------------------------------------------------------
// Радио, конкурсы, настройки, анонсы
// ---------------------------------------------------------------------------
test('radioTracks и radioTracksByCreator пробрасывают аргументы', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { radioTracks(limit: 10) { id } radioTracksByCreator(creatorUserId: "4") { id } }` });
  assert.equal(repo.calls.listRadioTracks[0][0].limit, 10);
  assert.equal(repo.calls.listRadioTracksByCreator[0][0].creatorUserId, '4');
  await server.stop();
});

test('updateRadioTrack / deleteRadioTrack требуют авторизацию', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const server = await startServer(repo);

  const anon = await exec(server, repo, { query: `mutation { deleteRadioTrack(id: "1") { id } }`, currentUser: null });
  assert.equal(errorsOf(anon)[0].extensions.code, 'UNAUTHENTICATED');

  await exec(server, repo, { query: `mutation { updateRadioTrack(input: { id: "1", title: "Новое" }) { id title } }`, currentUser: user });
  assert.equal(repo.calls.updateRadioTrack[0][0].title, 'Новое');
  await server.stop();
});

test('contests пробрасывает фильтры', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { contests(status: "open", scope: "poetry", limit: 8) { id } }` });
  const args = repo.calls.listContests[0][0];
  assert.equal(args.status, 'open');
  assert.equal(args.scope, 'poetry');
  assert.equal(args.limit, 8);
  await server.stop();
});

test('siteSettings возвращает список, updateSiteSetting доступен только админу', async () => {
  const repo = makeFakeRepo();
  const user = await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash: 'h', displayName: 'Юзер' });
  const admin = await repo.createUser({ email: 'adm@x.ru', login: 'admin', passwordHash: 'h', displayName: 'Админ', role: 'admin' });
  const server = await startServer(repo);

  const settings = await exec(server, repo, { query: `query { siteSettings { key value } }` });
  assert.equal(errorsOf(settings).length, 0);
  assert.ok(repo.calls.listSiteSettings);

  const forbidden = await exec(server, repo, { query: `mutation { updateSiteSetting(key: "k", value: "v") { key } }`, currentUser: user });
  assert.equal(errorsOf(forbidden)[0].extensions.code, 'FORBIDDEN');

  const ok = await exec(server, repo, { query: `mutation { updateSiteSetting(key: "siteTitle", value: "Литопотам") { key value } }`, currentUser: admin });
  assert.equal(errorsOf(ok).length, 0);
  assert.equal(repo.calls.upsertSiteSetting[0][0].key, 'siteTitle');
  assert.equal(repo.calls.upsertSiteSetting[0][0].value, 'Литопотам');
  await server.stop();
});

test('announcedWorks и announcements пробрасывают limit', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  await exec(server, repo, { query: `query { announcedWorks(limit: 4) { id } announcements(limit: 6) { id } }` });
  assert.equal(repo.calls.listAnnouncedWorks[0][0].limit, 4);
  assert.equal(repo.calls.listAnnouncedWorks[1][0].limit, 6);
  await server.stop();
});

// ---------------------------------------------------------------------------
// Аутентификация: валидация
// ---------------------------------------------------------------------------
test('register отклоняет запрос без согласия с правилами', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($input: RegisterInput!) { register(input: $input) { token } }`,
    variables: { input: { email: 'n@x.ru', login: 'newuser', password: 'password1', displayName: 'Новый', acceptTerms: false } },
  });
  assert.equal(errorsOf(result)[0].extensions.code, 'BAD_USER_INPUT');
  await server.stop();
});

test('register отклоняет повторный email или login', async () => {
  const repo = makeFakeRepo();
  await repo.createUser({ email: 'dup@x.ru', login: 'dup', passwordHash: 'h', displayName: 'Дубль' });
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($input: RegisterInput!) { register(input: $input) { token } }`,
    variables: { input: { email: 'dup@x.ru', login: 'another', password: 'password1', displayName: 'Другой', acceptTerms: true } },
  });
  assert.equal(errorsOf(result)[0].extensions.code, 'CONFLICT');
  await server.stop();
});

test('login отклоняет неверные учётные данные', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($input: LoginInput!) { login(input: $input) { token } }`,
    variables: { input: { identifier: 'nobody', password: 'wrong' } },
  });
  assert.equal(errorsOf(result)[0].extensions.code, 'UNAUTHENTICATED');
  await server.stop();
});

test('login возвращает токен для корректного пароля', async () => {
  const repo = makeFakeRepo();
  const passwordHash = await hashPassword('correct-horse');
  await repo.createUser({ email: 'u@x.ru', login: 'user', passwordHash, displayName: 'Юзер' });
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($input: LoginInput!) { login(input: $input) { token user { login } } }`,
    variables: { input: { identifier: 'user', password: 'correct-horse' } },
  });
  assert.equal(errorsOf(result).length, 0);
  assert.equal(result.data.login.user.login, 'user');
  assert.ok(result.data.login.token);
  await server.stop();
});

test('resetPassword отклоняет слишком короткий пароль', async () => {
  const repo = makeFakeRepo();
  const server = await startServer(repo);
  const result = await exec(server, repo, {
    query: `mutation($token: String!, $password: String!) { resetPassword(token: $token, password: $password) { token } }`,
    variables: { token: 't', password: 'short' },
  });
  assert.equal(errorsOf(result)[0].extensions.code, 'BAD_USER_INPUT');
  await server.stop();
});
