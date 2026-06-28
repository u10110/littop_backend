CREATE TABLE IF NOT EXISTS work_dislikes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_dislikes_unique UNIQUE (work_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_work_dislikes_work_created
    ON work_dislikes (work_id, created_at DESC);
