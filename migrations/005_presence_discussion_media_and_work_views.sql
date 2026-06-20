BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE work_comments
    ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE forum_posts
    ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS work_views (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    viewer_user_id      BIGINT REFERENCES users(id) ON DELETE CASCADE,
    viewed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_views_work_user_unique
    ON work_views(work_id, viewer_user_id)
    WHERE viewer_user_id IS NOT NULL;

COMMIT;