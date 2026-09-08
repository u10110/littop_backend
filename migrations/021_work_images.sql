-- AI/manual illustration URL for a work. Empty means no work image.
alter table works add column if not exists image_url text;
