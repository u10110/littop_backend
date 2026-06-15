-- 001_init.sql
-- Production-oriented PostgreSQL schema for Littop
--
-- Important:
-- This schema is inferred from the frontend domain model in the provided repo.
-- The repository itself does not contain backend ORM models or DB migrations.
-- The migration below turns the explicit UI/domain concepts into a production-ready relational schema.

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('reader', 'author', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE work_section_code AS ENUM ('poetry', 'prose', 'project');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE publication_status AS ENUM ('draft', 'published', 'hidden', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE showcase_slot_type AS ENUM ('classic', 'paid_promo', 'homepage_featured');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE forum_topic_status AS ENUM ('open', 'closed', 'archived', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('visible', 'hidden', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE project_format AS ENUM ('song', 'presentation', 'stage_production', 'screenplay', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE collection_type AS ENUM ('curated', 'system', 'recommended', 'homepage_block');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contest_scope AS ENUM ('site', 'author', 'forum');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contest_status AS ENUM ('draft', 'accepting_entries', 'voting', 'finished', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contest_entry_status AS ENUM ('submitted', 'approved', 'rejected', 'withdrawn', 'winner');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE source_type AS ENUM ('scrape', 'manual', 'api', 'seed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE users (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               CITEXT NOT NULL,
    login               CITEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    role                user_role NOT NULL DEFAULT 'author',
    status              user_status NOT NULL DEFAULT 'active',
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_login_unique UNIQUE (login),
    CONSTRAINT users_email_not_blank CHECK (btrim(email::text) <> ''),
    CONSTRAINT users_login_not_blank CHECK (btrim(login::text) <> '')
);

CREATE TABLE import_sources (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_name         TEXT NOT NULL,
    source_url          TEXT,
    source_type         source_type NOT NULL DEFAULT 'scrape',
    notes               TEXT,
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT import_sources_source_name_not_blank CHECK (btrim(source_name) <> '')
);

CREATE TABLE author_profiles (
    user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name        TEXT NOT NULL,
    bio                 TEXT,
    avatar_url          TEXT,
    city                TEXT,
    website_url         TEXT,
    rating_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
    works_count_cached  INTEGER NOT NULL DEFAULT 0,
    is_classic          BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    source_url          TEXT,
    import_source_id    BIGINT REFERENCES import_sources(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT author_profiles_display_name_not_blank CHECK (btrim(display_name) <> ''),
    CONSTRAINT author_profiles_rating_total_nonnegative CHECK (rating_total >= 0),
    CONSTRAINT author_profiles_works_count_nonnegative CHECK (works_count_cached >= 0)
);

CREATE TABLE author_showcase_slots (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slot_type           showcase_slot_type NOT NULL,
    position            INTEGER NOT NULL,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_override      TEXT,
    starts_at           TIMESTAMPTZ,
    ends_at             TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT author_showcase_slots_position_positive CHECK (position > 0),
    CONSTRAINT author_showcase_slots_valid_range CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT author_showcase_slots_unique UNIQUE (slot_type, position)
);

CREATE TABLE work_sections (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                work_section_code NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_sections_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE work_genres (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id          BIGINT NOT NULL REFERENCES work_sections(id) ON DELETE CASCADE,
    slug                TEXT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_genres_slug_unique UNIQUE (slug),
    CONSTRAINT work_genres_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT work_genres_slug_not_blank CHECK (btrim(slug) <> '')
);

CREATE TABLE works (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id          BIGINT NOT NULL REFERENCES work_sections(id) ON DELETE RESTRICT,
    genre_id            BIGINT REFERENCES work_genres(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    slug                TEXT,
    summary             TEXT,
    body                TEXT,
    excerpt             TEXT,
    project_format      project_format,
    status              publication_status NOT NULL DEFAULT 'published',
    published_at        TIMESTAMPTZ,
    source_url          TEXT,
    import_source_id    BIGINT REFERENCES import_sources(id) ON DELETE SET NULL,
    comments_count      INTEGER NOT NULL DEFAULT 0,
    ratings_count       INTEGER NOT NULL DEFAULT 0,
    average_rating      NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT works_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT works_slug_unique UNIQUE (slug),
    CONSTRAINT works_comments_count_nonnegative CHECK (comments_count >= 0),
    CONSTRAINT works_ratings_count_nonnegative CHECK (ratings_count >= 0),
    CONSTRAINT works_average_rating_range CHECK (average_rating >= 0 AND average_rating <= 5)
);

CREATE TABLE work_collections (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                TEXT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    section_id          BIGINT REFERENCES work_sections(id) ON DELETE SET NULL,
    collection_type     collection_type NOT NULL DEFAULT 'curated',
    is_public           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_collections_code_unique UNIQUE (code),
    CONSTRAINT work_collections_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT work_collections_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE work_collection_items (
    collection_id       BIGINT NOT NULL REFERENCES work_collections(id) ON DELETE CASCADE,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    position            INTEGER NOT NULL DEFAULT 0,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, work_id),
    CONSTRAINT work_collection_items_position_nonnegative CHECK (position >= 0)
);

CREATE TABLE work_ratings (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating              SMALLINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_ratings_value_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT work_ratings_unique UNIQUE (work_id, user_id)
);

CREATE TABLE work_comments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id   BIGINT REFERENCES work_comments(id) ON DELETE CASCADE,
    body                TEXT NOT NULL,
    status              moderation_status NOT NULL DEFAULT 'visible',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_comments_body_not_blank CHECK (btrim(body) <> '')
);

CREATE TABLE forum_sections (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug                TEXT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_public           BOOLEAN NOT NULL DEFAULT TRUE,
    source_url          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT forum_sections_slug_unique UNIQUE (slug),
    CONSTRAINT forum_sections_slug_not_blank CHECK (btrim(slug) <> ''),
    CONSTRAINT forum_sections_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE forum_topics (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id          BIGINT NOT NULL REFERENCES forum_sections(id) ON DELETE CASCADE,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    slug                TEXT,
    body                TEXT,
    replies_count       INTEGER NOT NULL DEFAULT 0,
    views_count         INTEGER NOT NULL DEFAULT 0,
    status              forum_topic_status NOT NULL DEFAULT 'open',
    is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
    source_url          TEXT,
    import_source_id    BIGINT REFERENCES import_sources(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_post_at        TIMESTAMPTZ,
    CONSTRAINT forum_topics_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT forum_topics_slug_unique UNIQUE (slug),
    CONSTRAINT forum_topics_replies_count_nonnegative CHECK (replies_count >= 0),
    CONSTRAINT forum_topics_views_count_nonnegative CHECK (views_count >= 0)
);

CREATE TABLE forum_tags (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug                TEXT NOT NULL,
    name                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT forum_tags_slug_unique UNIQUE (slug),
    CONSTRAINT forum_tags_slug_not_blank CHECK (btrim(slug) <> ''),
    CONSTRAINT forum_tags_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE forum_topic_tags (
    topic_id            BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    tag_id              BIGINT NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, tag_id)
);

CREATE TABLE forum_posts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    topic_id            BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_post_id      BIGINT REFERENCES forum_posts(id) ON DELETE CASCADE,
    body                TEXT NOT NULL,
    status              moderation_status NOT NULL DEFAULT 'visible',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT forum_posts_body_not_blank CHECK (btrim(body) <> '')
);

CREATE TABLE contests (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title                TEXT NOT NULL,
    slug                 TEXT,
    description          TEXT,
    contest_scope        contest_scope NOT NULL DEFAULT 'site',
    section_id           BIGINT REFERENCES work_sections(id) ON DELETE SET NULL,
    status               contest_status NOT NULL,
    starts_at            TIMESTAMPTZ,
    submission_ends_at   TIMESTAMPTZ,
    voting_ends_at       TIMESTAMPTZ,
    results_published_at TIMESTAMPTZ,
    cover_image_url      TEXT,
    source_url           TEXT,
    created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    import_source_id     BIGINT REFERENCES import_sources(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contests_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT contests_slug_unique UNIQUE (slug),
    CONSTRAINT contests_submission_range CHECK (submission_ends_at IS NULL OR starts_at IS NULL OR submission_ends_at >= starts_at),
    CONSTRAINT contests_voting_range CHECK (voting_ends_at IS NULL OR submission_ends_at IS NULL OR voting_ends_at >= submission_ends_at),
    CONSTRAINT contests_results_range CHECK (results_published_at IS NULL OR voting_ends_at IS NULL OR results_published_at >= voting_ends_at)
);

CREATE TABLE contest_entries (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contest_id          BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_note     TEXT,
    status              contest_entry_status NOT NULL DEFAULT 'submitted',
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contest_entries_unique UNIQUE (contest_id, work_id)
);

CREATE TABLE contest_votes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contest_id          BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    entry_id            BIGINT NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
    voter_user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score               SMALLINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contest_votes_score_range CHECK (score BETWEEN 1 AND 5),
    CONSTRAINT contest_votes_unique UNIQUE (contest_id, entry_id, voter_user_id)
);

CREATE TABLE contest_results (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contest_id          BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    entry_id            BIGINT NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
    place_number        INTEGER NOT NULL,
    points_total        NUMERIC(12,2),
    published_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contest_results_place_positive CHECK (place_number >= 1),
    CONSTRAINT contest_results_place_unique UNIQUE (contest_id, place_number),
    CONSTRAINT contest_results_entry_unique UNIQUE (contest_id, entry_id)
);

CREATE TABLE radio_streams (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT NOT NULL,
    stream_url          TEXT NOT NULL,
    page_url            TEXT,
    chat_url            TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT radio_streams_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT radio_streams_stream_url_not_blank CHECK (btrim(stream_url) <> '')
);

CREATE TABLE radio_tracks (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title               TEXT NOT NULL,
    author_name         TEXT,
    work_id             BIGINT REFERENCES works(id) ON DELETE SET NULL,
    duration_seconds    INTEGER,
    audio_url           TEXT,
    source_url          TEXT,
    import_source_id    BIGINT REFERENCES import_sources(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT radio_tracks_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT radio_tracks_duration_nonnegative CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE TABLE radio_playlist_items (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stream_id           BIGINT NOT NULL REFERENCES radio_streams(id) ON DELETE CASCADE,
    track_id            BIGINT NOT NULL REFERENCES radio_tracks(id) ON DELETE CASCADE,
    starts_at           TIMESTAMPTZ,
    ends_at             TIMESTAMPTZ,
    position            INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT radio_playlist_items_valid_range CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT radio_playlist_items_position_nonnegative CHECK (position IS NULL OR position >= 0)
);

CREATE TABLE radio_track_ratings (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    track_id            BIGINT NOT NULL REFERENCES radio_tracks(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating              SMALLINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT radio_track_ratings_value_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT radio_track_ratings_unique UNIQUE (track_id, user_id)
);

-- ---------------------------------------------------------
-- Seed mandatory domain lookups inferred from UI
-- ---------------------------------------------------------

INSERT INTO work_sections (code, name, description, sort_order)
VALUES
    ('poetry', 'Поэзия', 'Стихи и поэтические публикации', 10),
    ('prose', 'Проза', 'Прозаические публикации', 20),
    ('project', 'Творческие проекты', 'Песни, презентации, постановки, киносценарии', 30)
ON CONFLICT (code) DO NOTHING;

INSERT INTO forum_sections (slug, name, description, sort_order)
VALUES
    ('tm', 'Творческая мастерская', 'Разбор и критика произведений', 10),
    ('general', 'Общие обсуждения', 'Свободное общение авторов и читателей', 20),
    ('critique', 'Критика и отзывы', 'Отзывы и литературная критика', 30),
    ('announcements', 'Публикации и анонсы', 'Анонсы, объявления и новости сообщества', 40)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------

CREATE INDEX idx_users_status_role
    ON users (status, role);

CREATE INDEX idx_users_registered_at
    ON users (registered_at DESC);

CREATE INDEX idx_author_profiles_rating_total
    ON author_profiles (rating_total DESC);

CREATE INDEX idx_author_showcase_slots_active_window
    ON author_showcase_slots (slot_type, is_active, starts_at, ends_at);

CREATE INDEX idx_work_genres_section_id
    ON work_genres (section_id, sort_order, name);

CREATE INDEX idx_works_author_id
    ON works (author_user_id, created_at DESC);

CREATE INDEX idx_works_section_genre_status
    ON works (section_id, genre_id, status, published_at DESC);

CREATE INDEX idx_works_import_source_id
    ON works (import_source_id);

CREATE INDEX idx_work_collection_items_collection_position
    ON work_collection_items (collection_id, position, added_at);

CREATE INDEX idx_work_comments_work_created
    ON work_comments (work_id, created_at DESC);

CREATE INDEX idx_forum_topics_section_last_post
    ON forum_topics (section_id, is_pinned DESC, last_post_at DESC NULLS LAST, created_at DESC);

CREATE INDEX idx_forum_topics_author_id
    ON forum_topics (author_user_id, created_at DESC);

CREATE INDEX idx_forum_posts_topic_created
    ON forum_posts (topic_id, created_at);

CREATE INDEX idx_contests_status_dates
    ON contests (status, starts_at, submission_ends_at, voting_ends_at);

CREATE INDEX idx_contest_entries_contest_status
    ON contest_entries (contest_id, status, submitted_at DESC);

CREATE INDEX idx_contest_votes_entry_id
    ON contest_votes (entry_id);

CREATE INDEX idx_contest_results_contest_id
    ON contest_results (contest_id, place_number);

CREATE INDEX idx_radio_tracks_work_id
    ON radio_tracks (work_id);

CREATE INDEX idx_radio_playlist_items_stream_start
    ON radio_playlist_items (stream_id, starts_at DESC NULLS LAST, position);

CREATE INDEX idx_radio_track_ratings_track_id
    ON radio_track_ratings (track_id);

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_author_profiles_set_updated_at
BEFORE UPDATE ON author_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_author_showcase_slots_set_updated_at
BEFORE UPDATE ON author_showcase_slots
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_works_set_updated_at
BEFORE UPDATE ON works
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_work_collections_set_updated_at
BEFORE UPDATE ON work_collections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_work_ratings_set_updated_at
BEFORE UPDATE ON work_ratings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_work_comments_set_updated_at
BEFORE UPDATE ON work_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forum_sections_set_updated_at
BEFORE UPDATE ON forum_sections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forum_topics_set_updated_at
BEFORE UPDATE ON forum_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forum_posts_set_updated_at
BEFORE UPDATE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contests_set_updated_at
BEFORE UPDATE ON contests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contest_entries_set_updated_at
BEFORE UPDATE ON contest_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_radio_streams_set_updated_at
BEFORE UPDATE ON radio_streams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_radio_tracks_set_updated_at
BEFORE UPDATE ON radio_tracks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_radio_track_ratings_set_updated_at
BEFORE UPDATE ON radio_track_ratings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
