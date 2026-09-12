-- Derived preview URL for fast work-card rendering.
alter table works add column if not exists image_preview_url text;
