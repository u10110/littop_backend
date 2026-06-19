BEGIN;

ALTER TABLE author_profiles
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

COMMIT;
