import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import moment from 'moment';

import { decodeToken, getCurrentUserFromHeader, hashPassword, issueToken, verifyPassword } from './auth.mjs';

const CURRENT_TERMS_VERSION = '2026-06-28';
const ACCOUNT_REOPEN_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const typeDefs = `#graphql
  type Health {
    status: String!
    ok: Boolean!
    database: Boolean!
  }

  type AuthorProfileLink {
    label: String!
    url: String!
  }

  type AuthorProfile {
    displayName: String!
    bio: String
    avatarUrl: String
    coverImageUrl: String
    coverImagePositionX: Float!
    coverImagePositionY: Float!
    coverImageScale: Float!
    profileLinks: [AuthorProfileLink!]!
    city: String
    websiteUrl: String
    birthDate: String
    ratingTotal: Float!
    worksCountCached: Int!
    isClassic: Boolean!
    isMemorialPage: Boolean!
    isFeatured: Boolean!
    peachBalance: Int!
    audioUploadSlots: Int!
  }

  type User {
    id: ID!
    email: String!
    login: String!
    role: String!
    status: String!
    registeredAt: String!
    lastLoginAt: String
    lastSeenAt: String
    deletedAt: String
    isOnline: Boolean!
    createdAt: String!
    updatedAt: String!
    profile: AuthorProfile
  }

  type Author {
    id: ID!
    email: String!
    login: String!
    displayName: String!
    bio: String
    avatarUrl: String
    coverImageUrl: String
    coverImagePositionX: Float!
    coverImagePositionY: Float!
    coverImageScale: Float!
    profileLinks: [AuthorProfileLink!]!
    city: String
    websiteUrl: String
    birthDate: String
    ratingTotal: Float!
    worksCountCached: Int!
    isClassic: Boolean!
    isMemorialPage: Boolean!
    isFeatured: Boolean!
    isChild: Boolean
    registeredAt: String!
    lastSeenAt: String
    deletedAt: String
    isOnline: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Work {
    id: ID!
    title: String!
    slug: String
    summary: String
    body: String
    excerpt: String
    status: String!
    sectionCode: String!
    genreSlug: String
    projectFormat: String
    pdfUrl: String
    pdfFileName: String
    audioUrl: String
    audioFileName: String
    commentsCount: Int!
    ratingsCount: Int!
    averageRating: Float!
    likesCount: Int!
    dislikesCount: Int!
    likedByMe: Boolean!
    dislikedByMe: Boolean!
    announcementActive: Boolean!
    announcementCount: Int!
    publishedAt: String
    createdAt: String!
    updatedAt: String!
    author: Author!
  }

  type WorkRating {
    id: ID
    workId: ID!
    userId: ID!
    rating: Int!
    createdAt: String!
    updatedAt: String!
  }

  type WorkComment {
    id: ID!
    workId: ID!
    userId: ID!
    parentCommentId: ID
    body: String!
    imageUrl: String
    status: String!
    likesCount: Int!
    likedByMe: Boolean!
    createdAt: String!
    updatedAt: String!
    author: Author
  }

  type WorkReaderLedger {
    totalViews: Int!
    lockedViews: Int!
    batchSize: Int!
    viewers: [WorkViewer!]!
  }

  type PageVisitor {
    id: ID!
    workId: ID!
    viewerUserId: ID
    viewedAt: String!
    workTitle: String
    workSlug: String
    viewer: Author
  }

  type PageVisitorLedger {
    totalViews: Int!
    lockedViews: Int!
    batchSize: Int!
    visitors: [PageVisitor!]!
  }

  type AuthorReviewFeedItem {
    id: ID!
    body: String!
    status: String!
    createdAt: String!
    updatedAt: String!
    workId: ID!
    workTitle: String!
    workSlug: String
    commentAuthor: Author
    workAuthor: Author
  }

  type ForumSection {
    id: ID!
    slug: String!
    name: String!
    description: String
    sortOrder: Int!
    isPublic: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type ForumTopic {
    id: ID!
    title: String!
    slug: String
    body: String
    sectionSlug: String!
    repliesCount: Int!
    viewsCount: Int!
    status: String!
    isPinned: Boolean!
    tags: [String!]!
    imageUrl: String
    featuredMain: Boolean!
    createdAt: String!
    updatedAt: String!
    lastPostAt: String
    author: Author!
    posts: [ForumPost!]!
  }

  type ForumPost {
    id: ID!
    topicId: ID!
    userId: ID!
    parentPostId: ID
    body: String!
    imageUrl: String
    status: String!
    createdAt: String!
    updatedAt: String!
    author: Author
  }

  type PrivateDialog {
    peerUserId: ID!
    lastMessageBody: String!
    lastMessageAt: String!
    unreadCount: Int!
    peer: Author!
  }

  type PrivateMessage {
    id: ID!
    senderUserId: ID!
    recipientUserId: ID!
    body: String!
    status: String!
    createdAt: String!
    updatedAt: String!
    readAt: String
    sender: Author!
    recipient: Author!
  }

  type AuthorRatingEvent {
    id: ID!
    eventType: String!
    points: Int!
    createdAt: String!
    label: String!
  }

  type PeachTransaction {
    id: ID!
    amount: Int!
    kind: String!
    note: String
    createdAt: String!
  }

  type AuthorReviewRequest {
    id: ID!
    requesterUserId: ID!
    workId: ID
    title: String!
    message: String
    status: String!
    costPeaches: Int!
    createdAt: String!
    updatedAt: String!
  }

  type WorkViewer {
    id: ID!
    workId: ID!
    viewerUserId: ID
    viewedAt: String!
    viewer: Author
  }

  type Contest {
    id: ID!
    title: String!
    slug: String
    description: String
    contestScope: String!
    status: String!
    startsAt: String
    submissionEndsAt: String
    votingEndsAt: String
    resultsPublishedAt: String
    coverImageUrl: String
    sourceUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type RadioTrack {
    id: ID!
    title: String!
    authorName: String
    creatorUserId: ID
    durationSeconds: Int
    audioUrl: String
    sourceUrl: String
    averageRating: Float!
    ratingsCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  input RadioTrackUpdateInput {
    id: ID!
    title: String
    authorName: String
  }

  type SiteSetting {
    key: String!
    value: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    email: String!
    login: String!
    password: String!
    displayName: String!
    acceptTerms: Boolean!
  }

  input LoginInput {
    identifier: String!
    password: String!
  }

  input CreateWorkInput {
    sectionCode: String!
    genreSlug: String
    title: String!
    summary: String
    body: String
    excerpt: String
    status: String = "published"
    projectFormat: String
    pdfUrl: String
    pdfFileName: String
    audioUrl: String
    audioFileName: String
  }

  input UpdateWorkInput {
    sectionCode: String!
    genreSlug: String
    title: String!
    summary: String
    body: String
    excerpt: String
    status: String = "published"
    projectFormat: String
    pdfUrl: String
    pdfFileName: String
    audioUrl: String
    audioFileName: String
  }

  input CreateForumTopicInput {
    sectionSlug: String!
    title: String!
    body: String!
    imageUrl: String
    featuredMain: Boolean
  }

  input AuthorProfileLinkInput {
    label: String!
    url: String!
  }

  input UpdateMyProfileInput {
    displayName: String!
    bio: String
    avatarUrl: String
    coverImageUrl: String
    coverImagePositionX: Float
    coverImagePositionY: Float
    coverImageScale: Float
    profileLinks: [AuthorProfileLinkInput!]
    city: String
    websiteUrl: String
    birthDate: String
  }

  input CreateManagedAuthorInput {
    login: String!
    displayName: String!
    bio: String
    city: String
    websiteUrl: String
    birthDate: String
  }

  input UpdateForumTopicInput {
    sectionSlug: String!
    title: String!
    body: String!
    imageUrl: String
    featuredMain: Boolean
  }

  type Query {
    health: Health!
    me: User
    authors(limit: Int = 20, offset: Int = 0, search: String, classicsOnly: Boolean = false, memorialOnly: Boolean = false, featuredOnly: Boolean = false, childrenOnly: Boolean = false): [Author!]!
    onlineAuthors(limit: Int = 12): [Author!]!
    todayVisitors(limit: Int = 12): [Author!]!
    birthdayAuthors(limit: Int = 12): [Author!]!
    author(id: ID, login: String): Author
    works(limit: Int = 20, offset: Int = 0, sectionCode: String, genreSlug: String, authorId: ID, search: String, status: String = "published", createdToday: Boolean): [Work!]!
    announcedWorks(limit: Int = 12): [Work!]!
    announcements(limit: Int = 12): [Work!]!
    work(id: ID, slug: String): Work
    workComments(workId: ID!, limit: Int = 50, offset: Int = 0): [WorkComment!]!
    workViewers(workId: ID!, limit: Int = 100): [WorkViewer!]!
    workReaders(workId: ID!, limit: Int = 100): WorkReaderLedger!
    authorPageVisitors(workId: ID!, limit: Int = 100): PageVisitorLedger!
    workLikers(workId: ID!, limit: Int = 100): [Author!]!
    workCommentLikers(commentId: ID!, limit: Int = 100): [Author!]!
    authorWrittenWorkComments(authorId: ID!, limit: Int = 50): [AuthorReviewFeedItem!]!
    authorReceivedWorkComments(authorId: ID!, limit: Int = 50): [AuthorReviewFeedItem!]!
    forumSections: [ForumSection!]!
    forumTopics(sectionSlug: String, tag: String, featuredMain: Boolean, limit: Int = 20, offset: Int = 0): [ForumTopic!]!
    forumTopic(id: ID, slug: String): ForumTopic
    privateDialogs(limit: Int = 50): [PrivateDialog!]!
    privateMessages(withUserId: ID, withLogin: String, limit: Int = 100): [PrivateMessage!]!
    myManagedAuthors(limit: Int = 100): [Author!]!
    myRatingEvents(limit: Int = 50): [AuthorRatingEvent!]!
    myPeachTransactions(limit: Int = 50): [PeachTransaction!]!
    myGrantedPeaches(limit: Int = 100): [PeachTransaction!]!
    contests(status: String, scope: String, limit: Int = 20, offset: Int = 0): [Contest!]!
    radioTracks(limit: Int = 20, offset: Int = 0): [RadioTrack!]!
    radioTracksByCreator(creatorUserId: ID!): [RadioTrack!]!
    siteSettings: [SiteSetting!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, password: String!): AuthPayload!
    reopenClosedAccount(input: LoginInput!): AuthPayload!
    touchPresence: User!
    updateMyProfile(input: UpdateMyProfileInput!): User!
    adminUpdateAuthorProfile(authorId: ID!, input: UpdateMyProfileInput!): Author!
    adminUpdateAuthorPageFlags(authorId: ID!, isClassic: Boolean!, isMemorialPage: Boolean!, isChild: Boolean): Author!
    adminCreateManagedAuthor(input: CreateManagedAuthorInput!): Author!
    adminSwitchManagedAuthor(managedUserId: ID!): AuthPayload!
    adminGrantPeaches(login: String!, amount: Int!, note: String): User!
    closeMyAccount: Boolean!
    adminDeleteUser(userId: ID!): Boolean!
    createWork(input: CreateWorkInput!): Work!
    adminCreateWork(authorId: ID!, input: CreateWorkInput!): Work!
    updateWork(workId: ID!, input: UpdateWorkInput!): Work!
    deleteWork(workId: ID!): Work!
    updateRadioTrack(input: RadioTrackUpdateInput!): RadioTrack!
    deleteRadioTrack(id: ID!): RadioTrack!
    updateSiteSetting(key: String!, value: String!): SiteSetting!
    activateWorkAnnouncement(workId: ID!): Work!
    deactivateWorkAnnouncement(workId: ID!): Work!
    toggleWorkLike(workId: ID!): Work!
    toggleWorkDislike(workId: ID!): Work!
    rateWork(workId: ID!, rating: Int!): WorkRating!
    addWorkComment(workId: ID!, body: String!, parentCommentId: ID, imageUrl: String): WorkComment!
    updateWorkComment(commentId: ID!, body: String!, imageUrl: String): WorkComment!
    deleteWorkComment(commentId: ID!): WorkComment!
    toggleWorkCommentLike(commentId: ID!): WorkComment!
    createForumTopic(input: CreateForumTopicInput!): ForumTopic!
    updateForumTopic(topicId: ID!, input: UpdateForumTopicInput!): ForumTopic!
    deleteForumTopic(topicId: ID!): ForumTopic!
    closeForumTopic(topicId: ID!): ForumTopic!
    openForumTopic(topicId: ID!): ForumTopic!
    incrementForumTopicViews(topicId: ID!): ForumTopic!
    createForumPost(topicId: ID!, body: String!, parentPostId: ID, imageUrl: String): ForumPost!
    updateForumPost(postId: ID!, body: String!, imageUrl: String): ForumPost!
    deleteForumPost(postId: ID!): ForumPost!
    sendPrivateMessage(recipientUserId: ID, recipientLogin: String, body: String!): PrivateMessage!
    markPrivateMessagesRead(withUserId: ID, withLogin: String): Int!
    purchaseAudioUploadPack: User!
    requestAdminReview(workId: ID, title: String!, message: String): AuthorReviewRequest!
  }
`;

function requireAuth(currentUser) {
  if (!currentUser) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return currentUser;
}

function isAdminUser(user, adminUserIds) {
  return Boolean(user?.id) && adminUserIds?.has(String(user.id));
}

// Editors and admins may manage editorial content (editor-column topics,
// the "show on home" flag, and the site-level header image).
function isEditorialUser(user, adminUserIds) {
  return Boolean(user?.id) && (user.role === 'editor' || isAdminUser(user, adminUserIds));
}

function applyAdminAccess(user, adminUserIds) {
  if (!user) return null;
  if (!isAdminUser(user, adminUserIds)) return user;
  return {
    ...user,
    role: 'admin',
  };
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_IN = '2h';

function resolveOnlineFlag(entity) {
  if (typeof entity?.isOnline === 'boolean') {
    return entity.isOnline;
  }
  const timestamp = Date.parse(String(entity?.lastSeenAt ?? ''));
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= ONLINE_WINDOW_MS;
}

function canReopenDeletedAccount(user) {
  if (user?.status !== 'deleted' || !user?.deletedAt) return false;
  const deletedAt = Date.parse(String(user.deletedAt));
  if (!Number.isFinite(deletedAt)) return false;
  return Date.now() - deletedAt <= ACCOUNT_REOPEN_WINDOW_MS;
}

function deletedAccountReopenUntil(user) {
  const deletedAt = Date.parse(String(user?.deletedAt ?? ''));
  if (!Number.isFinite(deletedAt)) return null;
  return new Date(deletedAt + ACCOUNT_REOPEN_WINDOW_MS).toISOString();
}

function buildAbsoluteUrl(baseUrl, path) {
  try {
    return new URL(path, baseUrl || 'http://localhost:5173').toString();
  } catch {
    return '';
  }
}

async function sendMailerSafely(mailer, fn) {
  if (!mailer?.enabled || typeof fn !== 'function') return;
  try {
    await fn();
  } catch {
    // Почтовая отправка не должна валить основную операцию.
  }
}

function issuePasswordResetToken(user, secret) {
  return jwt.sign(
    {
      purpose: 'password-reset',
      sub: String(user.id),
      email: user.email,
      passwordHash: user.passwordHash,
    },
    secret,
    { expiresIn: PASSWORD_RESET_EXPIRES_IN },
  );
}

function buildPasswordResetUrl(frontendBaseUrl, token) {
  const baseUrl = String(frontendBaseUrl || 'http://localhost:5173').trim() || 'http://localhost:5173';
  const url = new URL(baseUrl);
  url.searchParams.set('auth', 'reset');
  url.searchParams.set('token', token);
  return url.toString();
}

async function findUserByEmailForReset(repo, email) {
  if (typeof repo.getUserByEmail === 'function') {
    return repo.getUserByEmail(email);
  }
  if (typeof repo.findUserByEmail === 'function') {
    return repo.findUserByEmail(email);
  }
  if (typeof repo.getUserByIdentifier === 'function') {
    return repo.getUserByIdentifier(email);
  }
  return null;
}

async function updatePasswordForUser(repo, { userId, passwordHash }) {
  if (typeof repo.updateUserPassword === 'function') {
    return repo.updateUserPassword({ userId, passwordHash });
  }
  if (typeof repo.updateUserPasswordHash === 'function') {
    return repo.updateUserPasswordHash({ userId, passwordHash });
  }
  throw new GraphQLError('Password reset is not available in this repository implementation.', {
    extensions: { code: 'NOT_IMPLEMENTED' },
  });
}

function readPasswordResetConfig(repo) {
  return repo?.__passwordResetConfig ?? {};
}

const resolvers = {
  Query: {
    health: async (_, __, { repo }) => ({ status: 'ok', ok: true, database: await repo.ping() }),
    me: async (_, __, { currentUser }) => currentUser ?? null,
    authors: async (_, args, { repo }) => repo.listAuthors(args),
    onlineAuthors: async (_, args, { repo }) => repo.listOnlineAuthors(args),
    todayVisitors: async (_, args, { repo }) => repo.listTodayVisitors(args),
    birthdayAuthors: async (_, args, { repo }) => repo.listBirthdayAuthors(args),
    author: async (_, args, { repo }) => repo.getAuthor(args),
    works: async (_, args, { repo }) => repo.listWorks(args),
    announcedWorks: async (_, args, { repo }) => repo.listAnnouncedWorks(args),
    announcements: async (_, args, { repo }) => repo.listAnnouncedWorks(args),
    work: async (_, args, { repo, currentUser }) => {
      const work = args.id
        ? await repo.getWorkById(args.id)
        : args.slug
          ? await repo.getWorkBySlug(args.slug)
          : null;

      if (!work) {
        return null;
      }

      if (work.status !== 'published' && String(currentUser?.id ?? '') !== String(work.author?.id ?? work.authorUserId ?? '')) {
        return null;
      }

      if (currentUser?.id && String(currentUser.id) !== String(work.author?.id ?? work.authorUserId ?? '')) {
        await repo.registerWorkView({ workId: work.id, viewerUserId: currentUser.id });
      }

      return work;
    },
    workComments: async (_, args, { repo }) => repo.listWorkComments(args),
    workViewers: async (_, args, { repo }) => repo.listWorkViewers(args),
    workReaders: async (_, args, { repo }) => repo.listWorkReaders(args),
    authorPageVisitors: async (_, args, { repo }) => repo.listAuthorPageVisitorsByWork(args),
    workLikers: async (_, args, { repo }) => repo.listWorkLikers(args),
    workCommentLikers: async (_, args, { repo }) => repo.listWorkCommentLikers(args),
    authorWrittenWorkComments: async (_, args, { repo }) => repo.listWrittenWorkComments({ authorUserId: args.authorId, limit: args.limit }),
    authorReceivedWorkComments: async (_, args, { repo }) => repo.listReceivedWorkComments({ authorUserId: args.authorId, limit: args.limit }),
    forumSections: async (_, __, { repo }) => repo.listForumSections(),
    forumTopics: async (_, args, { repo }) => repo.listForumTopics(args),
    forumTopic: async (_, args, { repo }) => repo.getForumTopic(args),
    privateDialogs: async (_, args, { repo, currentUser }) => repo.listPrivateDialogs({ ...args, userId: requireAuth(currentUser).id }),
    privateMessages: async (_, args, { repo, currentUser }) => repo.listPrivateMessages({ ...args, userId: requireAuth(currentUser).id }),
    myManagedAuthors: async (_, args, { repo, currentUser, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can inspect managed accounts', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.listManagedAuthorAccounts({ ownerUserId: null, limit: args.limit ?? 100 });
    },
    myRatingEvents: async (_, args, { repo, currentUser }) => repo.listUserRatingEvents({ userId: requireAuth(currentUser).id, limit: args.limit ?? 50 }),
    myPeachTransactions: async (_, args, { repo, currentUser }) => repo.listUserPeachTransactions({ userId: requireAuth(currentUser).id, limit: args.limit ?? 50 }),
    myGrantedPeaches: async (_, args, { repo, currentUser, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can inspect granted peaches', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.listGrantedPeachTransactions({ userId: user.id, limit: args.limit ?? 100 });
    },
    contests: async (_, args, { repo }) => repo.listContests(args),
    radioTracks: async (_, args, { repo }) => repo.listRadioTracks(args),
    radioTracksByCreator: async (_, { creatorUserId }, { repo }) => repo.listRadioTracksByCreator({ creatorUserId }),
    siteSettings: async (_, __, { repo }) => repo.listSiteSettings(),
  },
  Mutation: {
    register: async (_, { input }, { repo, jwtSecret }) => {
      if (!input.acceptTerms) {
        throw new GraphQLError('Нужно принять Пользовательское соглашение.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const existing = await repo.findUserByEmailOrLogin(input.email, input.login);
      if (existing) {
        throw new GraphQLError('User with this email or login already exists', {
          extensions: { code: 'CONFLICT' },
        });
      }
      const passwordHash = await hashPassword(input.password);
      const user = await repo.createUser({
        ...input,
        passwordHash,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      });
      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    login: async (_, { input }, { repo, jwtSecret }) => {
      const user = await repo.getUserByIdentifierIncludingDeleted(input.identifier);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (user.status === 'deleted') {
        if (canReopenDeletedAccount(user)) {
          throw new GraphQLError('Аккаунт закрыт, но его ещё можно открыть.', {
            extensions: {
              code: 'ACCOUNT_REOPEN_AVAILABLE',
              reopenUntil: deletedAccountReopenUntil(user),
              login: user.login,
            },
          });
        }
        throw new GraphQLError('Аккаунт закрыт, и срок восстановления уже истёк.', {
          extensions: { code: 'ACCOUNT_DELETED' },
        });
      }
      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    requestPasswordReset: async (_, { email }, { repo, jwtSecret }) => {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        throw new GraphQLError('Email is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const user = await findUserByEmailForReset(repo, normalizedEmail);
      if (!user) {
        return true;
      }

      const { frontendBaseUrl, mailer } = readPasswordResetConfig(repo);
      const resetToken = issuePasswordResetToken(user, jwtSecret);
      const resetUrl = buildPasswordResetUrl(frontendBaseUrl, resetToken);

      if (mailer?.enabled && typeof mailer.sendPasswordResetEmail === 'function') {
        await mailer.sendPasswordResetEmail({
          to: user.email,
          displayName: user.profile?.displayName || user.login,
          resetUrl,
        });
      }

      return true;
    },
    reopenClosedAccount: async (_, { input }, { repo, jwtSecret }) => {
      const user = await repo.getUserByIdentifierIncludingDeleted(input.identifier);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new GraphQLError('Неверный логин/email или пароль.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (!canReopenDeletedAccount(user)) {
        throw new GraphQLError('Этот аккаунт уже нельзя восстановить.', {
          extensions: { code: 'ACCOUNT_DELETED' },
        });
      }
      const reopenedUser = await repo.reopenUserAccount({ userId: user.id });
      const token = issueToken(reopenedUser, jwtSecret);
      return { token, user: reopenedUser };
    },

    resetPassword: async (_, { token, password }, { repo, jwtSecret }) => {
      if (String(password || '').length < 8) {
        throw new GraphQLError('Password must be at least 8 characters long', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      let payload;
      try {
        payload = jwt.verify(token, jwtSecret);
      } catch {
        throw new GraphQLError('Reset token is invalid or expired', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (payload?.purpose !== 'password-reset' || !payload?.sub) {
        throw new GraphQLError('Reset token is invalid or expired', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const user = await repo.getUserById(payload.sub);
      if (!user || user.email !== payload.email || user.passwordHash !== payload.passwordHash) {
        throw new GraphQLError('Reset token is invalid or expired', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await hashPassword(password);
      const updatedUser = await updatePasswordForUser(repo, { userId: user.id, passwordHash });
      const authUser = updatedUser ?? await repo.getUserById(user.id);
      const authToken = issueToken(authUser, jwtSecret);
      return { token: authToken, user: authUser };
    },
    touchPresence: async (_, __, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return applyAdminAccess(await repo.touchUserPresence(user.id), adminUserIds);
    },
    updateMyProfile: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
      if (!displayName) {
        throw new GraphQLError('Display name is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return repo.updateUserProfile({
        userId: user.id,
        displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverImageUrl: input.coverImageUrl,
        coverImagePositionX: input.coverImagePositionX,
        coverImagePositionY: input.coverImagePositionY,
        coverImageScale: input.coverImageScale,
        profileLinks: input.profileLinks,
        city: input.city,
        websiteUrl: input.websiteUrl,
        birthDate: moment.utc(input.birthDate).format(" YYYY-MM-DD") ,
      });
    },
    adminUpdateAuthorProfile: async (_, { authorId, input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can edit classic author pages', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
      if (!displayName) {
        throw new GraphQLError('Display name is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      await repo.updateUserProfile({
        userId: authorId,
        displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverImageUrl: input.coverImageUrl,
        coverImagePositionX: input.coverImagePositionX,
        coverImagePositionY: input.coverImagePositionY,
        coverImageScale: input.coverImageScale,
        profileLinks: input.profileLinks,
        city: input.city,
        websiteUrl: input.websiteUrl,
        birthDate: input.birthDate,
      });
      return repo.getAuthor({ id: authorId });
    },
    adminUpdateAuthorPageFlags: async (_, { authorId, isClassic, isMemorialPage, isChild }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can change author page flags', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return repo.updateAuthorPageFlags({ authorId, isClassic, isMemorialPage, isChild });
    },
    adminCreateManagedAuthor: async (_, { input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can create managed accounts', { extensions: { code: 'FORBIDDEN' } });
      }
      const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
      const login = typeof input.login === 'string' ? input.login.trim() : '';
      if (!displayName || !login) {
        throw new GraphQLError('Login and display name are required', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return repo.createManagedAuthorAccount({
        ownerUserId: user.id,
        login,
        displayName,
        bio: input.bio,
        city: input.city,
        websiteUrl: input.websiteUrl,
        birthDate: input.birthDate,
      });
    },
    adminSwitchManagedAuthor: async (_, { managedUserId }, { currentUser, repo, adminUserIds, jwtSecret }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can switch into managed accounts', { extensions: { code: 'FORBIDDEN' } });
      }
      const allowed = await repo.getManagedAuthorAccount({ managedUserId });
      const managedUser = await repo.getUserById(managedUserId);
      if (!allowed || !managedUser) {
        throw new GraphQLError('Managed account not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { token: issueToken(managedUser, jwtSecret), user: managedUser };
    },
    adminGrantPeaches: async (_, { login, amount, note }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can grant peaches', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.grantPeachesByLogin({ login, amount, note, grantedByUserId: user.id });
    },
    closeMyAccount: async (_, __, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.closeUserAccount({ userId: user.id });
    },
    adminDeleteUser: async (_, { userId }, { currentUser, repo, adminUserIds }) => {
      const actor = requireAuth(currentUser);
      if (!isAdminUser(actor, adminUserIds)) {
        throw new GraphQLError('Только администратор может удалять аккаунты', { extensions: { code: 'FORBIDDEN' } });
      }
      if (String(actor.id) === String(userId)) {
        throw new GraphQLError('Администратор не может удалить сам себя', { extensions: { code: 'FORBIDDEN' } });
      }
      const target = await repo.getUserById(userId);
      if (target?.role === 'admin') {
        throw new GraphQLError('Нельзя удалить другого администратора', { extensions: { code: 'FORBIDDEN' } });
      }
      await repo.closeUserAccount({ userId });
      return true;
    },
    createWork: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createWork({ ...input, authorUserId: user.id });
    },
    adminCreateWork: async (_, { authorId, input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can publish works for classic author pages', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return repo.createWork({ ...input, authorUserId: authorId });
    },
    updateWork: async (_, { workId, input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.updateWork({ workId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds), ...input });
    },
    deleteWork: async (_, { workId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteWork({ workId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    activateWorkAnnouncement: async (_, { workId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      const isAdmin = isAdminUser(user, adminUserIds);
      return repo.activateWorkAnnouncement({ workId, activatedByUserId: user.id, isAdmin });
    },
    deactivateWorkAnnouncement: async (_, { workId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      const isAdmin = isAdminUser(user, adminUserIds);
      if (!isAdmin) {
        throw new GraphQLError('Admin only', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.deactivateWorkAnnouncement({ workId });
    },
    toggleWorkLike: async (_, { workId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.toggleWorkLike({ workId, userId: user.id });
    },
    toggleWorkDislike: async (_, { workId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.toggleWorkDislike({ workId, userId: user.id });
    },
    rateWork: async (_, { workId, rating }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.upsertWorkRating({ workId, userId: user.id, rating });
    },
    addWorkComment: async (_, { workId, body, parentCommentId, imageUrl }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      const comment = await repo.addWorkComment({ workId, userId: user.id, body, parentCommentId, imageUrl });
      const mailer = repo.__notificationMailer;
      const frontendBaseUrl = repo.__frontendBaseUrl;
      const work = await repo.getWorkById(workId);
      if (work?.author?.email && String(work.author.id) !== String(user.id)) {
        await sendMailerSafely(mailer, () => mailer.sendWorkReplyEmail({
          to: work.author.email,
          recipientName: work.author.displayName || work.author.login,
          senderName: comment?.author?.displayName || comment?.author?.login || user.login,
          workTitle: work.title,
          workUrl: buildAbsoluteUrl(frontendBaseUrl, `/works/${work.slug || work.id}`),
        }));
      }
      return comment;
    },
    updateRadioTrack: async (_, { input }, { currentUser, repo, adminUserIds }) => {
      if (!currentUser) throw new GraphQLError('Auth required', { extensions: { code: 'UNAUTHENTICATED' } });
      const user = currentUser;
      return repo.updateRadioTrack({ id: input.id, title: input.title, authorName: input.authorName, canManageAll: isAdminUser(user, adminUserIds), requestingUserId: user.id });
    },
    deleteRadioTrack: async (_, { id }, { currentUser, repo, adminUserIds }) => {
      if (!currentUser) throw new GraphQLError('Auth required', { extensions: { code: 'UNAUTHENTICATED' } });
      const user = currentUser;
      return repo.deleteRadioTrack({ id, canManageAll: isAdminUser(user, adminUserIds), requestingUserId: user.id });
    },
    updateSiteSetting: async (_, { key, value }, { currentUser, repo, adminUserIds }) => {
      if (!isAdminUser(currentUser, adminUserIds)) throw new GraphQLError('Only owner can change site settings', { extensions: { code: 'FORBIDDEN' } });
      return repo.upsertSiteSetting({ key, value });
    },
    updateWorkComment: async (_, { commentId, body, imageUrl }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.updateWorkComment({ commentId, userId: user.id, canManageAll: isAdminUser(user, adminUserIds), body, imageUrl });
    },
    deleteWorkComment: async (_, { commentId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteWorkComment({ commentId, actorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    toggleWorkCommentLike: async (_, { commentId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.toggleWorkCommentLike({ commentId, userId: user.id });
    },
    createForumTopic: async (_, { input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      if ((input.sectionSlug === 'editor-column' || input.featuredMain === true) && !isEditorialUser(user, adminUserIds)) {
        throw new GraphQLError('Только редактор или администратор может публиковать в колонке редактора или выносить темы на главную.', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.createForumTopic({ ...input, authorUserId: user.id });
    },
    updateForumTopic: async (_, { topicId, input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      const editorial = isEditorialUser(user, adminUserIds);
      const wantsEditorialContent = input.sectionSlug === 'editor-column' || (input.featuredMain !== undefined && input.featuredMain !== null);
      if (wantsEditorialContent && !editorial) {
        throw new GraphQLError('Только редактор или администратор может публиковать в колонке редактора или выносить темы на главную.', { extensions: { code: 'FORBIDDEN' } });
      }
      return repo.updateForumTopic({ topicId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds), canManageEditorial: editorial, ...input });
    },
    deleteForumTopic: async (_, { topicId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteForumTopic({ topicId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    closeForumTopic: async (_, { topicId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      const topic = await repo.getForumTopic({ id: topicId });
      if (!topic) throw new GraphQLError('Тема не найдена.', { extensions: { code: 'NOT_FOUND' } });
      const isOwner = String(topic.author?.id) === String(user.id);
      if (!isAdminUser(user, adminUserIds) && !isOwner) throw new GraphQLError('Только автор темы или администратор может закрывать тему.', { extensions: { code: 'FORBIDDEN' } });
      return repo.setForumTopicStatus({ topicId, status: 'closed', canManageAll: true });
    },
    openForumTopic: async (_, { topicId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      const topic = await repo.getForumTopic({ id: topicId });
      if (!topic) throw new GraphQLError('Тема не найдена.', { extensions: { code: 'NOT_FOUND' } });
      const isOwner = String(topic.author?.id) === String(user.id);
      if (!isAdminUser(user, adminUserIds) && !isOwner) throw new GraphQLError('Только автор темы или администратор может открывать тему.', { extensions: { code: 'FORBIDDEN' } });
      return repo.setForumTopicStatus({ topicId, status: 'open', canManageAll: true });
    },
    incrementForumTopicViews: async (_, { topicId }, { repo }) => {
      const topic = await repo.incrementForumTopicViews({ topicId });
      if (!topic) {
        throw new GraphQLError('Тема не найдена.', { extensions: { code: 'NOT_FOUND' } });
      }
      return topic;
    },
    createForumPost: async (_, { topicId, body, parentPostId, imageUrl }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      const post = await repo.createForumPost({ topicId, body, parentPostId, imageUrl, authorUserId: user.id });
      const mailer = repo.__notificationMailer;
      const frontendBaseUrl = repo.__frontendBaseUrl;
      const topic = await repo.getForumTopic({ id: topicId });
      if (topic?.author?.email && String(topic.author.id) !== String(user.id)) {
        await sendMailerSafely(mailer, () => mailer.sendForumMessageEmail({
          to: topic.author.email,
          recipientName: topic.author.displayName || topic.author.login,
          senderName: post?.author?.displayName || post?.author?.login || user.login,
          topicTitle: topic.title,
          topicUrl: buildAbsoluteUrl(frontendBaseUrl, `/forum/${topic.slug || topic.id}`),
        }));
      }
      return post;
    },
    updateForumPost: async (_, { postId, body, imageUrl }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.updateForumPost({ postId, body, imageUrl, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    deleteForumPost: async (_, { postId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteForumPost({ postId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    sendPrivateMessage: async (_, { recipientUserId, recipientLogin, body }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      const message = await repo.sendPrivateMessage({ senderUserId: user.id, recipientUserId, recipientLogin, body });
      const mailer = repo.__notificationMailer;
      const frontendBaseUrl = repo.__frontendBaseUrl;
      if (message?.recipient?.email && String(message.recipient.id) !== String(user.id)) {
        await sendMailerSafely(mailer, () => mailer.sendPrivateMessageEmail({
          to: message.recipient.email,
          recipientName: message.recipient.displayName || message.recipient.login,
          senderName: message.sender?.displayName || message.sender?.login || user.login,
          messageText: body,
          dialogUrl: buildAbsoluteUrl(frontendBaseUrl, `/messages?with=${encodeURIComponent(user.login)}`),
        }));
      }
      return message;
    },
    markPrivateMessagesRead: async (_, { withUserId, withLogin }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.markPrivateMessagesRead({ userId: user.id, withUserId, withLogin });
    },
    purchaseAudioUploadPack: async (_, __, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.purchaseAudioUploadPack({ userId: user.id });
    },
    requestAdminReview: async (_, { workId, title, message }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createAuthorReviewRequest({ requesterUserId: user.id, workId, title, message });
    },
  },
  Author: {
    isOnline: (parent) => resolveOnlineFlag(parent),
    isMemorialPage: (parent) => Boolean(parent?.isMemorialPage),
    isChild: (parent) => Boolean(parent?.isChild),
    coverImagePositionX: async (parent, _, { repo }) => parent?.coverImagePositionX ?? (await repo.getAuthor({ id: parent.id }))?.coverImagePositionX ?? 50,
    coverImagePositionY: async (parent, _, { repo }) => parent?.coverImagePositionY ?? (await repo.getAuthor({ id: parent.id }))?.coverImagePositionY ?? 50,
    coverImageScale: async (parent, _, { repo }) => parent?.coverImageScale ?? (await repo.getAuthor({ id: parent.id }))?.coverImageScale ?? 1,
    profileLinks: async (parent, _, { repo }) => Array.isArray(parent?.profileLinks) ? parent.profileLinks : repo.getAuthorProfileLinks(parent.id),
  },
  AuthorProfile: {
    isMemorialPage: (parent) => Boolean(parent?.isMemorialPage),
    peachBalance: (parent) => Number(parent?.peachBalance ?? 0),
    audioUploadSlots: (parent) => Number(parent?.audioUploadSlots ?? 0),
    coverImagePositionX: (parent) => Number(parent?.coverImagePositionX ?? 50),
    coverImagePositionY: (parent) => Number(parent?.coverImagePositionY ?? 50),
    coverImageScale: (parent) => Number(parent?.coverImageScale ?? 1),
    profileLinks: async (parent, _, { repo }) => Array.isArray(parent?.profileLinks) ? parent.profileLinks : repo.getAuthorProfileLinks(parent?.userId),
  },
  User: {
    isOnline: (parent) => resolveOnlineFlag(parent),
    profile: async (parent, _, { repo }) => parent.profile ?? repo.getUserById(parent.id).then((user) => user?.profile ?? null),
  },
  Work: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.authorUserId),
    likedByMe: async (parent, _, { repo, currentUser }) => {
      if (!currentUser?.id) return false;
      return repo.hasUserLikedWork({ workId: parent.id, userId: currentUser.id });
    },
    dislikedByMe: async (parent, _, { repo, currentUser }) => {
      if (!currentUser?.id) return false;
      return repo.hasUserDislikedWork({ workId: parent.id, userId: currentUser.id });
    },
    announcementActive: async (parent, _, { repo }) => {
      if (typeof parent?.announcementActive === 'boolean') return parent.announcementActive;
      return repo.hasWorkAnnouncement({ workId: parent.id });
    },
  },
  WorkComment: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.userId),
    likedByMe: async (parent, _, { repo, currentUser }) => {
      if (!currentUser?.id) return false;
      return repo.hasUserLikedWorkComment({ commentId: parent.id, userId: currentUser.id });
    },
  },
  ForumTopic: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.authorUserId),
    posts: async (parent, _, { repo }) => repo.listForumPosts(parent.id),
  },
  ForumPost: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.userId),
  },
  PrivateMessage: {
    sender: async (parent, _, { repo }) => parent.sender ?? repo.getAuthorByUserId(parent.senderUserId),
    recipient: async (parent, _, { repo }) => parent.recipient ?? repo.getAuthorByUserId(parent.recipientUserId),
  },
};

export function createApolloServer({ repo, jwtSecret, adminUserIds = new Set(), frontendBaseUrl = 'http://localhost:5173', mailer = null }) {
  repo.__passwordResetConfig = {
    frontendBaseUrl,
    mailer,
  };
  repo.__notificationMailer = mailer;
  repo.__frontendBaseUrl = frontendBaseUrl;
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });
}

export async function buildContext({ req }, { repo, jwtSecret, adminUserIds = new Set() }) {
  const authHeader = req?.headers?.authorization ?? '';
  const currentUser = applyAdminAccess(await getCurrentUserFromHeader(authHeader, jwtSecret, repo), adminUserIds);
  if (currentUser?.id && typeof repo.touchUserPresence === 'function') {
    await repo.touchUserPresence(currentUser.id);
  }
  return { repo, jwtSecret, authHeader, currentUser, adminUserIds, decodeToken };
}
