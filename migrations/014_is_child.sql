-- Pack 14 (isChild author type / childrenOnly filter): add is_child to author_profiles.
-- Idempotent: safe to re-run; no-op if the column already exists.
alter table author_profiles add column if not exists is_child boolean not null default false;
