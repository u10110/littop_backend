ALTER TABLE work_collections ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE work_collections ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE work_collections ADD COLUMN IF NOT EXISTS author_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS work_collections_author_position_idx ON work_collections(author_user_id, position, id);
