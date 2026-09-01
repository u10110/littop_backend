ALTER TABLE work_announcements ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE work_announcements ADD COLUMN IF NOT EXISTS revoked_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS work_announcements_active_idx ON work_announcements(work_id) WHERE revoked_at IS NULL;
