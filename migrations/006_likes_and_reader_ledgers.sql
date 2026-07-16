CREATE TABLE IF NOT EXISTS work_likes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_likes_unique UNIQUE (work_id, user_id)
);

CREATE TABLE IF NOT EXISTS work_comment_likes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id          BIGINT NOT NULL REFERENCES work_comments(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_comment_likes_unique UNIQUE (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS work_page_views (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    author_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewer_user_id      BIGINT REFERENCES users(id) ON DELETE CASCADE,
    viewed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_likes_work_created
    ON work_likes (work_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_comment_likes_comment_created
    ON work_comment_likes (comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_page_views_work_created
    ON work_page_views (work_id, viewed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_work_page_views_author_created
    ON work_page_views (author_user_id, viewed_at DESC, id DESC);
