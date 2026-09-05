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

## Database migrations

Apply missing SQL migrations with:

```bash
npm run db:migrate
```

The command records each successfully applied file in `schema_migrations`, takes a PostgreSQL advisory lock to prevent parallel runs, verifies checksums, and skips the mockup seed by default. Preview changes with `npm run db:migrate -- --dry-run`.

For an already populated database which predates migration tracking, run this once after verifying the schema:

```bash
npm run db:migrate -- --baseline
```

`--baseline` records the current migration files without executing SQL. To include the mockup seed deliberately, use `npm run db:migrate -- --include-seed`.

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
