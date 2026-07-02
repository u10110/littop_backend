BEGIN;

ALTER TABLE author_profiles
    ADD COLUMN IF NOT EXISTS cover_image_position_x NUMERIC(5,2) NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS cover_image_position_y NUMERIC(5,2) NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS cover_image_scale NUMERIC(6,3) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS author_profile_links (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_author_profile_links_user_id ON author_profile_links(user_id, sort_order, id);

CREATE TABLE IF NOT EXISTS author_rating_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_key TEXT NOT NULL UNIQUE,
    points INT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_author_rating_events_user_id_created_at ON author_rating_events(user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS managed_author_accounts (
    managed_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_managed_author_accounts_owner_user_id ON managed_author_accounts(owner_user_id, created_at DESC, managed_user_id);

COMMIT;
