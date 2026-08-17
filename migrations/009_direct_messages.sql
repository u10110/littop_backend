-- 009_direct_messages.sql
-- Private one-to-one messages between Littop users.

CREATE TABLE IF NOT EXISTS direct_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT direct_messages_not_self CHECK (sender_user_id <> recipient_user_id),
    CONSTRAINT direct_messages_body_not_blank CHECK (btrim(body) <> '')
);

CREATE INDEX IF NOT EXISTS direct_messages_conversation_idx
  ON direct_messages (sender_user_id, recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx
  ON direct_messages (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;
