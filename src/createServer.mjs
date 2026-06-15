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
    city: String
    websiteUrl: String
    ratingTotal: Float!
    worksCountCached: Int!
    isClassic: Boolean!
    isFeatured: Boolean!
    registeredAt: String!
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
    status: String!
    createdAt: String!
    updatedAt: String!
    author: Author
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

  input CreateForumTopicInput {
    sectionSlug: String!
    title: String!
    body: String!
  }

  type Query {
    health: Health!
    me: User
    authors(limit: Int = 20, offset: Int = 0, search: String, classicsOnly: Boolean = false, featuredOnly: Boolean = false): [Author!]!
    author(id: ID, login: String): Author
    works(limit: Int = 20, offset: Int = 0, sectionCode: String, genreSlug: String, authorId: ID, search: String, status: String = "published"): [Work!]!
    work(id: ID, slug: String): Work
    workComments(workId: ID!, limit: Int = 50, offset: Int = 0): [WorkComment!]!
    forumSections: [ForumSection!]!
    forumTopics(sectionSlug: String, tag: String, limit: Int = 20, offset: Int = 0): [ForumTopic!]!
    forumTopic(id: ID, slug: String): ForumTopic
    contests(status: String, scope: String, limit: Int = 20, offset: Int = 0): [Contest!]!
    radioTracks(limit: Int = 20, offset: Int = 0): [RadioTrack!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createWork(input: CreateWorkInput!): Work!
    rateWork(workId: ID!, rating: Int!): WorkRating!
    addWorkComment(workId: ID!, body: String!, parentCommentId: ID): WorkComment!
    createForumTopic(input: CreateForumTopicInput!): ForumTopic!
    createForumPost(topicId: ID!, body: String!, parentPostId: ID): ForumPost!
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

const resolvers = {
  Query: {
    health: async (_, __, { repo }) => ({ status: 'ok', ok: true, database: await repo.ping() }),
    me: async (_, __, { currentUser, repo }) => currentUser ? repo.getUserById(currentUser.id) : null,
    authors: async (_, args, { repo }) => repo.listAuthors(args),
    author: async (_, args, { repo }) => repo.getAuthor(args),
    works: async (_, args, { repo }) => repo.listWorks(args),
    work: async (_, args, { repo }) => {
      if (args.id) return repo.getWorkById(args.id);
      if (args.slug) return repo.getWorkBySlug(args.slug);
      return null;
    },
    workComments: async (_, args, { repo }) => repo.listWorkComments(args),
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
    createWork: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createWork({ ...input, authorUserId: user.id });
    },
    rateWork: async (_, { workId, rating }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.upsertWorkRating({ workId, userId: user.id, rating });
    },
    addWorkComment: async (_, { workId, body, parentCommentId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.addWorkComment({ workId, userId: user.id, body, parentCommentId });
    },
    createForumTopic: async (_, { input }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createForumTopic({ ...input, authorUserId: user.id });
    },
    createForumPost: async (_, { topicId, body, parentPostId }, { currentUser, repo }) => {
      const user = requireAuth(currentUser);
      return repo.createForumPost({ topicId, body, parentPostId, authorUserId: user.id });
    },
  },
  User: {
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

export function createApolloServer({ repo, jwtSecret }) {
  return new ApolloServer({
    typeDefs,
    resolvers,
  });
}

export async function buildContext({ req }, { repo, jwtSecret }) {
  const authHeader = req?.headers?.authorization ?? '';
  const currentUser = await getCurrentUserFromHeader(authHeader, jwtSecret, repo);
  return { repo, jwtSecret, authHeader, currentUser, decodeToken };
}
