import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';

import { decodeToken, getCurrentUserFromHeader, hashPassword, issueToken, verifyPassword } from './auth.mjs';

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
    createdAt: String!
    updatedAt: String!
    author: Author
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
    login: String!
    password: String!
    displayName: String!
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
    work(id: ID, slug: String): Work
    workComments(workId: ID!, limit: Int = 50, offset: Int = 0): [WorkComment!]!
    workViewers(workId: ID!, limit: Int = 100): [WorkViewer!]!
    forumSections: [ForumSection!]!
    forumTopics(sectionSlug: String, tag: String, limit: Int = 20, offset: Int = 0): [ForumTopic!]!
    forumTopic(id: ID, slug: String): ForumTopic
    contests(status: String, scope: String, limit: Int = 20, offset: Int = 0): [Contest!]!
    radioTracks(limit: Int = 20, offset: Int = 0): [RadioTrack!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    touchPresence: User!
    updateMyProfile(input: UpdateMyProfileInput!): User!
    closeMyAccount: Boolean!
    createWork(input: CreateWorkInput!): Work!
    updateWork(workId: ID!, input: UpdateWorkInput!): Work!
    deleteWork(workId: ID!): Work!
    rateWork(workId: ID!, rating: Int!): WorkRating!
    addWorkComment(workId: ID!, body: String!, parentCommentId: ID, imageUrl: String): WorkComment!
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

const resolvers = {
  Query: {
    health: async (_, __, { repo }) => ({ status: 'ok', ok: true, database: await repo.ping() }),
    me: async (_, __, { currentUser }) => currentUser ?? null,
    authors: async (_, args, { repo }) => repo.listAuthors(args),
    onlineAuthors: async (_, args, { repo }) => repo.listOnlineAuthors(args),
    author: async (_, args, { repo }) => repo.getAuthor(args),
    works: async (_, args, { repo }) => repo.listWorks(args),
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
    forumSections: async (_, __, { repo }) => repo.listForumSections(),
    forumTopics: async (_, args, { repo }) => repo.listForumTopics(args),
    forumTopic: async (_, args, { repo }) => repo.getForumTopic(args),
    contests: async (_, args, { repo }) => repo.listContests(args),
    radioTracks: async (_, args, { repo }) => repo.listRadioTracks(args),
  },
  Mutation: {
    register: async (_, { input }, { repo, jwtSecret }) => {
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
    rateWork: async (_, { workId, rating }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.upsertWorkRating({ workId, userId: user.id, rating });
    },
    addWorkComment: async (_, { workId, body, parentCommentId, imageUrl }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.addWorkComment({ workId, userId: user.id, body, parentCommentId, imageUrl });
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
  },
  WorkComment: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.userId),
  },
  ForumTopic: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.authorUserId),
    posts: async (parent, _, { repo }) => repo.listForumPosts(parent.id),
  },
  ForumPost: {
    author: async (parent, _, { repo }) => parent.author ?? repo.getAuthorByUserId(parent.userId),
  },
};

export function createApolloServer({ repo, jwtSecret, adminUserIds = new Set() }) {
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
