create table if not exists password_reset_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create index if not exists password_reset_tokens_user_active_idx
    on password_reset_tokens (user_id, expires_at)
    where used_at is null;

create index if not exists password_reset_tokens_expires_at_idx
    on password_reset_tokens (expires_at);
