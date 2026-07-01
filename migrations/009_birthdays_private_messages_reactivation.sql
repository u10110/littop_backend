BEGIN;

ALTER TABLE author_profiles
    ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE works
    ADD COLUMN IF NOT EXISTS account_restore_status publication_status;

ALTER TABLE forum_topics
    ADD COLUMN IF NOT EXISTS account_restore_status forum_topic_status,
    ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE forum_posts
    ADD COLUMN IF NOT EXISTS account_restore_status moderation_status;

ALTER TABLE work_comments
    ADD COLUMN IF NOT EXISTS account_restore_status moderation_status;

CREATE TABLE IF NOT EXISTS private_messages (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body                TEXT NOT NULL,
    status              moderation_status NOT NULL DEFAULT 'visible',
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT private_messages_body_not_blank CHECK (btrim(body) <> ''),
    CONSTRAINT private_messages_not_self CHECK (sender_user_id <> recipient_user_id)
);

DROP TRIGGER IF EXISTS trg_private_messages_updated_at ON private_messages;
CREATE TRIGGER trg_private_messages_updated_at
BEFORE UPDATE ON private_messages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS private_messages_dialog_idx
    ON private_messages (LEAST(sender_user_id, recipient_user_id), GREATEST(sender_user_id, recipient_user_id), created_at DESC);

CREATE INDEX IF NOT EXISTS private_messages_recipient_unread_idx
    ON private_messages (recipient_user_id, created_at DESC)
    WHERE status = 'visible' AND read_at IS NULL;

COMMIT;
