import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';

import { decodeToken, getCurrentUserFromHeader, hashPassword, issueToken, verifyPassword } from './auth.mjs';
import {
  buildPasswordResetToken,
  buildPasswordResetUrl,
  isValidEmail,
  matchesPasswordResetToken,
  normalizeEmail,
  validatePassword,
  verifyPasswordResetToken,
} from './email.mjs';

const typeDefs = `#graphql
  type Health {
    status: String!
    ok: Boolean!
    database: Boolean!
  }

  type AuthorProfile {
    displayName: String!
    bio: String
    avatarUrl: String
    coverImageUrl: String
    city: String
    websiteUrl: String
    ratingTotal: Float!
    worksCountCached: Int!
    isClassic: Boolean!
    isFeatured: Boolean!
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
    city: String
    websiteUrl: String
    ratingTotal: Float!
    worksCountCached: Int!
    isClassic: Boolean!
    isFeatured: Boolean!
    registeredAt: String!
    lastSeenAt: String
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
    commentsCount: Int!
    ratingsCount: Int!
    averageRating: Float!
    likesCount: Int!
    likedByMe: Boolean!
    announcementActive: Boolean!
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
    durationSeconds: Int
    audioUrl: String
    sourceUrl: String
    averageRating: Float!
    ratingsCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    email: String!
    password: String!
    displayName: String!
  }

  input LoginInput {
    email: String!
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
  }

  input CreateForumTopicInput {
    sectionSlug: String!
    title: String!
    body: String!
  }

  input UpdateMyProfileInput {
    displayName: String!
    bio: String
    avatarUrl: String
    coverImageUrl: String
    city: String
    websiteUrl: String
  }

  input UpdateForumTopicInput {
    sectionSlug: String!
    title: String!
    body: String!
  }

  type Query {
    health: Health!
    me: User
    authors(limit: Int = 20, offset: Int = 0, search: String, classicsOnly: Boolean = false, featuredOnly: Boolean = false): [Author!]!
    onlineAuthors(limit: Int = 12): [Author!]!
    author(id: ID, login: String): Author
    works(limit: Int = 20, offset: Int = 0, sectionCode: String, genreSlug: String, authorId: ID, search: String, status: String = "published"): [Work!]!
    announcedWorks(limit: Int = 12): [Work!]!
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
    forumTopics(sectionSlug: String, tag: String, limit: Int = 20, offset: Int = 0): [ForumTopic!]!
    forumTopic(id: ID, slug: String): ForumTopic
    contests(status: String, scope: String, limit: Int = 20, offset: Int = 0): [Contest!]!
    radioTracks(limit: Int = 20, offset: Int = 0): [RadioTrack!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, password: String!): AuthPayload!
    touchPresence: User!
    updateMyProfile(input: UpdateMyProfileInput!): User!
    closeMyAccount: Boolean!
    createWork(input: CreateWorkInput!): Work!
    updateWork(workId: ID!, input: UpdateWorkInput!): Work!
    deleteWork(workId: ID!): Work!
    activateWorkAnnouncement(workId: ID!): Work!
    toggleWorkLike(workId: ID!): Work!
    rateWork(workId: ID!, rating: Int!): WorkRating!
    addWorkComment(workId: ID!, body: String!, parentCommentId: ID, imageUrl: String): WorkComment!
    updateWorkComment(commentId: ID!, body: String!, imageUrl: String): WorkComment!
    deleteWorkComment(commentId: ID!): WorkComment!
    toggleWorkCommentLike(commentId: ID!): WorkComment!
    createForumTopic(input: CreateForumTopicInput!): ForumTopic!
    updateForumTopic(topicId: ID!, input: UpdateForumTopicInput!): ForumTopic!
    deleteForumTopic(topicId: ID!): ForumTopic!
    createForumPost(topicId: ID!, body: String!, parentPostId: ID, imageUrl: String): ForumPost!
    updateForumPost(postId: ID!, body: String!, imageUrl: String): ForumPost!
    deleteForumPost(postId: ID!): ForumPost!
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

function applyAdminAccess(user, adminUserIds) {
  if (!user) return null;
  if (!isAdminUser(user, adminUserIds)) return user;
  return {
    ...user,
    role: 'admin',
  };
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

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

function badUserInput(message) {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

function normalizeRequiredEmail(rawValue) {
  const email = normalizeEmail(rawValue);
  if (!isValidEmail(email)) {
    throw badUserInput('Введите корректный email.');
  }
  return email;
}

function normalizeRequiredPassword(rawValue) {
  const password = String(rawValue ?? '');
  const validationMessage = validatePassword(password);
  if (validationMessage) {
    throw badUserInput(validationMessage);
  }
  return password;
}

function normalizeRequiredDisplayName(rawValue) {
  const displayName = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!displayName) {
    throw badUserInput('Display name is required');
  }
  return displayName;
}

function createResolvers({ mailer = { enabled: false }, frontendBaseUrl = '' } = {}) {
  return {
  Query: {
    health: async (_, __, { repo }) => ({ status: 'ok', ok: true, database: await repo.ping() }),
    me: async (_, __, { currentUser }) => currentUser ?? null,
    authors: async (_, args, { repo }) => repo.listAuthors(args),
    onlineAuthors: async (_, args, { repo }) => repo.listOnlineAuthors(args),
    author: async (_, args, { repo }) => repo.getAuthor(args),
    works: async (_, args, { repo }) => repo.listWorks(args),
    announcedWorks: async (_, args, { repo }) => repo.listAnnouncedWorks(args),
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
    contests: async (_, args, { repo }) => repo.listContests(args),
    radioTracks: async (_, args, { repo }) => repo.listRadioTracks(args),
  },
  Mutation: {
    register: async (_, { input }, { repo, jwtSecret }) => {
      if (!mailer?.enabled) {
        throw new GraphQLError('Почтовая отправка не настроена на сервере.', {
          extensions: { code: 'FAILED_PRECONDITION' },
        });
      }

      const email = normalizeRequiredEmail(input.email);
      const password = normalizeRequiredPassword(input.password);
      const displayName = normalizeRequiredDisplayName(input.displayName);
      const existing = await (repo.getUserByEmail?.(email) ?? repo.findUserByEmailOrLogin(email, ''));
      if (existing) {
        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'CONFLICT' },
        });
      }

      const passwordHash = await hashPassword(password);
      const user = await repo.createUser({ email, passwordHash, displayName });

      try {
        await mailer.sendWelcomeEmail({
          to: email,
          displayName,
          appUrl: frontendBaseUrl,
        });
      } catch (error) {
        console.error('Failed to send welcome email', error);
      }

      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    login: async (_, { input }, { repo, jwtSecret }) => {
      const email = normalizeRequiredEmail(input.email);
      const user = await (repo.getUserByEmail?.(email) ?? repo.getUserByIdentifier(email));
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    requestPasswordReset: async (_, { email }, { repo, jwtSecret }) => {
      if (!mailer?.enabled) {
        throw new GraphQLError('Почтовая отправка не настроена на сервере.', {
          extensions: { code: 'FAILED_PRECONDITION' },
        });
      }

      const normalizedEmail = normalizeRequiredEmail(email);
      const user = await (repo.getUserByEmail?.(normalizedEmail) ?? repo.getUserByIdentifier(normalizedEmail));
      if (!user) {
        return true;
      }

      const token = buildPasswordResetToken(user, jwtSecret);
      const resetUrl = buildPasswordResetUrl(frontendBaseUrl, token);
      await mailer.sendPasswordResetEmail({
        to: normalizedEmail,
        displayName: user.profile?.displayName || user.login || 'Автор',
        resetUrl,
      });
      return true;
    },
    resetPassword: async (_, { token, password }, { repo, jwtSecret }) => {
      let payload;
      try {
        payload = verifyPasswordResetToken(token, jwtSecret);
      } catch {
        throw new GraphQLError('Ссылка восстановления недействительна или истекла.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const user = await repo.getUserById(payload.sub);
      if (!user || !matchesPasswordResetToken(user, payload)) {
        throw new GraphQLError('Ссылка восстановления недействительна или истекла.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const nextPassword = normalizeRequiredPassword(password);
      const passwordHash = await hashPassword(nextPassword);
      const updatedUser = await repo.updateUserPassword({ userId: user.id, passwordHash });
      const authToken = issueToken(updatedUser, jwtSecret);
      return { token: authToken, user: updatedUser };
    },
    touchPresence: async (_, __, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return applyAdminAccess(await repo.touchUserPresence(user.id), adminUserIds);
    },
    updateMyProfile: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      const displayName = normalizeRequiredDisplayName(input.displayName);
      return repo.updateUserProfile({
        userId: user.id,
        displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverImageUrl: input.coverImageUrl,
        city: input.city,
        websiteUrl: input.websiteUrl,
      });
    },
    closeMyAccount: async (_, __, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.closeUserAccount({ userId: user.id });
    },
    createWork: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createWork({ ...input, authorUserId: user.id });
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
      if (!isAdminUser(user, adminUserIds)) {
        throw new GraphQLError('Only admin can add works to announcements', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return repo.activateWorkAnnouncement({ workId, activatedByUserId: user.id });
    },
    toggleWorkLike: async (_, { workId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.toggleWorkLike({ workId, userId: user.id });
    },
    rateWork: async (_, { workId, rating }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.upsertWorkRating({ workId, userId: user.id, rating });
    },
    addWorkComment: async (_, { workId, body, parentCommentId, imageUrl }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.addWorkComment({ workId, userId: user.id, body, parentCommentId, imageUrl });
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
    createForumTopic: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createForumTopic({ ...input, authorUserId: user.id });
    },
    updateForumTopic: async (_, { topicId, input }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.updateForumTopic({ topicId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds), ...input });
    },
    deleteForumTopic: async (_, { topicId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteForumTopic({ topicId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    createForumPost: async (_, { topicId, body, parentPostId, imageUrl }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createForumPost({ topicId, body, parentPostId, imageUrl, authorUserId: user.id });
    },
    updateForumPost: async (_, { postId, body, imageUrl }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.updateForumPost({ postId, body, imageUrl, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
    deleteForumPost: async (_, { postId }, { currentUser, repo, adminUserIds }) => {
      const user = requireAuth(currentUser);
      return repo.softDeleteForumPost({ postId, authorUserId: user.id, canManageAll: isAdminUser(user, adminUserIds) });
    },
  },
  Author: {
    isOnline: (parent) => resolveOnlineFlag(parent),
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
  };
}

export function createApolloServer({ repo, jwtSecret, adminUserIds = new Set(), mailer = { enabled: false }, frontendBaseUrl = '' }) {
  return new ApolloServer({
    typeDefs,
    resolvers: createResolvers({ mailer, frontendBaseUrl }),
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
