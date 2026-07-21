-- Pack 15 (announcement count + deactivate support): add announcement_count to works.
-- Idempotent: safe to re-run; no-op if the column already exists.
alter table works add column if not exists announcement_count integer not null default 0;
