-- 007_editor_column_and_announcements.sql
BEGIN;

INSERT INTO forum_sections (slug, name, description, sort_order)
VALUES (
    'editor-column',
    'Колонка редактора',
    'Редакторские статьи и материалы, публикуемые через темы форума.',
    15
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS work_announcements (
    id                  BIGSERIAL PRIMARY KEY,
    work_id             BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    activated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT work_announcements_work_id_unique UNIQUE (work_id)
);

CREATE INDEX IF NOT EXISTS idx_work_announcements_created_at
    ON work_announcements (created_at DESC, id DESC);

COMMIT;
