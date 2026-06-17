# Littop backend API

Node.js backend for `littop` built with:
- Apollo GraphQL
- PostgreSQL (`pg`)
- JWT auth
- bcrypt password hashing

## What is implemented

### Queries
- `health`
- `me`
- `authors`
- `author`
- `works`
- `work`
- `workComments`
- `forumSections`
- `forumTopics`
- `forumTopic`
- `contests`
- `radioTracks`

### Mutations
- `register`
- `login`
- `createWork`
- `rateWork`
- `addWorkComment`
- `createForumTopic`
- `createForumPost`

## Required database

Apply the production migration first:

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

## Environment

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Dev watch mode:

```bash
npm run dev
```

## Test

```bash
npm test
```

## GraphQL endpoint

Default endpoint:

- `http://localhost:4000/`

Example health query:

```graphql
query {
  health {
    status
    ok
    database
  }
}
```

## Auth flow

1. `register`
2. take `token`
3. send header:

```http
Authorization: Bearer <token>
```

## Notes

This backend is generated from the inferred production schema we built for the provided frontend repository. The original repo did not contain backend ORM models or an existing API layer.

SOC QAuth
1. заполнить .env:
   - VK_CLIENT_ID
   - VK_CLIENT_SECRET
   - OK_CLIENT_ID
   - OK_CLIENT_SECRET
   - OK_APPLICATION_KEY
   - PUBLIC_BASE_URL
2. применить миграцию migrations/003_social_auth.sql
3. перезапустить backend
