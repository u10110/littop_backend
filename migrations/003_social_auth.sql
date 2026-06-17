BEGIN;

CREATE TABLE IF NOT EXISTS social_accounts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    provider_user_id    TEXT NOT NULL,
    provider_email      CITEXT,
    provider_login      TEXT,
    profile_url         TEXT,
    avatar_url          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_accounts_provider_check CHECK (provider IN ('vk', 'ok')),
    CONSTRAINT social_accounts_provider_user_unique UNIQUE (provider, provider_user_id),
    CONSTRAINT social_accounts_provider_user_link_unique UNIQUE (provider, user_id),
    CONSTRAINT social_accounts_provider_user_id_not_blank CHECK (btrim(provider_user_id) <> '')
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id
    ON social_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_social_accounts_provider_lookup
    ON social_accounts (provider, provider_user_id);

DROP TRIGGER IF EXISTS trg_social_accounts_set_updated_at ON social_accounts;
CREATE TRIGGER trg_social_accounts_set_updated_at
BEFORE UPDATE ON social_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
