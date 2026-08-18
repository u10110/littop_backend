import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';

import { decodeToken, getCurrentUserFromHeader, hashPassword, issueToken, verifyPassword } from './auth.mjs';
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from './passwordReset.mjs';

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
    viewsCount: Int!
    likedByMe: Boolean!
    publishedAt: String
    createdAt: String!
    updatedAt: String!
    author: Author!
  }

  type WorkGenre {
    slug: String!
    name: String!
    sectionCode: String!
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

  type HomeCommentWork {
    id: ID!
    title: String!
    slug: String
  }

  type HomeComment {
    id: ID!
    body: String!
    createdAt: String!
    work: HomeCommentWork!
    author: Author
  }

  type DirectMessage {
    id: ID!
    senderUserId: ID!
    recipientUserId: ID!
    body: String!
    readAt: String
    createdAt: String!
  }

  type Conversation {
    peerUserId: ID!
    peer: Author!
    lastMessageBody: String!
    lastMessageAt: String!
    unreadCount: Int!
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
    todayVisitors(limit: Int = 12): [Author!]!
    author(id: ID, login: String): Author
    works(limit: Int = 20, offset: Int = 0, sectionCode: String, genreSlug: String, authorId: ID, search: String, status: String = "published", createdToday: Boolean): [Work!]!
    workGenres(sectionCode: String): [WorkGenre!]!
    announcedWorks(limit: Int = 12): [Work!]!
    recentWorkComments(limit: Int = 12): [HomeComment!]!
    work(id: ID, slug: String): Work
    workComments(workId: ID!, limit: Int = 50, offset: Int = 0): [WorkComment!]!
    workViewers(workId: ID!, limit: Int = 100): [WorkViewer!]!
    workReaders(workId: ID!, limit: Int = 100): WorkReaderLedger!
    authorPageVisitors(workId: ID!, limit: Int = 100): PageVisitorLedger!
    workLikers(workId: ID!, limit: Int = 100): [Author!]!
    workCommentLikers(commentId: ID!, limit: Int = 100): [Author!]!
    forumSections: [ForumSection!]!
    forumTopics(sectionSlug: String, tag: String, limit: Int = 20, offset: Int = 0): [ForumTopic!]!
    forumTopic(id: ID, slug: String): ForumTopic
    contests(status: String, scope: String, limit: Int = 20, offset: Int = 0): [Contest!]!
    radioTracks(limit: Int = 20, offset: Int = 0): [RadioTrack!]!
    myConversations(limit: Int = 30): [Conversation]!
    directMessages(peerUserId: ID!): [DirectMessage]!
    unreadDirectMessagesCount: Int!
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
    sendDirectMessage(peerUserId: ID!, body: String!): DirectMessage!
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

const resolvers = {
  Query: {
    health: async (_, __, { repo }) => ({ status: 'ok', ok: true, database: await repo.ping() }),
    me: async (_, __, { currentUser }) => currentUser ?? null,
    authors: async (_, args, { repo }) => repo.listAuthors(args),
    onlineAuthors: async (_, args, { repo }) => repo.listOnlineAuthors(args),
    todayVisitors: async (_, args, { repo }) => repo.listTodayVisitors(args),
    author: async (_, args, { repo }) => repo.getAuthor(args),
    works: async (_, args, { repo }) => repo.listWorks(args),
    workGenres: async (_, args, { repo }) => repo.listWorkGenres(args),
    announcedWorks: async (_, args, { repo }) => repo.listAnnouncedWorks(args),
    recentWorkComments: async (_, args, { repo }) => repo.listRecentWorkComments(args),
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
    forumSections: async (_, __, { repo }) => repo.listForumSections(),
    forumTopics: async (_, args, { repo }) => repo.listForumTopics(args),
    forumTopic: async (_, args, { repo }) => repo.getForumTopic(args),
    contests: async (_, args, { repo }) => repo.listContests(args),
    radioTracks: async (_, args, { repo }) => repo.listRadioTracks(args),
    myConversations: async (_, { limit }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.listConversations({ userId: user.id, limit });
    },
    directMessages: async (_, { peerUserId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.listDirectMessages({ userId: user.id, peerUserId });
    },
    unreadDirectMessagesCount: async (_, __, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.unreadDirectMessagesCount({ userId: user.id });
    },
  },
  Mutation: {
    register: async (_, { input }, { repo, jwtSecret }) => {
      if (input.acceptTerms !== true) {
        throw new GraphQLError('User agreement must be accepted', {
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
      const user = await repo.createUser({ ...input, passwordHash });
      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    login: async (_, { input }, { repo, jwtSecret }) => {
      const user = await repo.getUserByIdentifier(input.identifier);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const token = issueToken(user, jwtSecret);
      return { token, user };
    },
    requestPasswordReset: async (_, { email }, { repo, mailer, frontendBaseUrl }) => {
      const normalizedEmail = String(email ?? '').trim().toLowerCase();
      const user = normalizedEmail && typeof repo.findUserByEmail === 'function'
        ? await repo.findUserByEmail(normalizedEmail)
        : null;
      // Return success even for an unknown email to avoid account enumeration.
      if (!user || !mailer || typeof mailer.sendPasswordReset !== 'function') return true;
      const token = createPasswordResetToken();
      await repo.createPasswordResetToken({
        userId: user.id,
        tokenHash: hashPasswordResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      });
      await mailer.sendPasswordReset({
        email: user.email,
        resetUrl: buildPasswordResetUrl(frontendBaseUrl, token),
      });
      return true;
    },
    resetPassword: async (_, { token, password }, { repo, jwtSecret }) => {
      const normalizedToken = String(token ?? '').trim();
      const normalizedPassword = String(password ?? '');
      if (!normalizedToken || normalizedPassword.length < 8) {
        throw new GraphQLError('Invalid or expired password reset link', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const consumed = await repo.consumePasswordResetToken({ tokenHash: hashPasswordResetToken(normalizedToken) });
      if (!consumed?.userId) {
        throw new GraphQLError('Invalid or expired password reset link', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const passwordHash = await hashPassword(normalizedPassword);
      const user = await repo.updateUserPassword({ userId: consumed.userId, passwordHash });
      if (!user) {
        throw new GraphQLError('Account not found', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return { token: issueToken(user, jwtSecret), user };
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
    sendDirectMessage: async (_, { peerUserId, body }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.sendDirectMessage({ senderUserId: user.id, recipientUserId: peerUserId, body });
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

export function createApolloServer({ repo, jwtSecret, adminUserIds = new Set(), mailer = null, frontendBaseUrl = 'http://localhost:5173' }) {
  return new ApolloServer({
    typeDefs,
    resolvers: {
      ...resolvers,
      Mutation: {
        ...resolvers.Mutation,
        requestPasswordReset: (parent, args, context) => resolvers.Mutation.requestPasswordReset(parent, args, { ...context, mailer, frontendBaseUrl }),
      },
    },
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
