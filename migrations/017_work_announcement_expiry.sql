-- Pack 19: seven-day work announcement retention and query support.
-- Idempotent: safe to apply after any previous migration state.
alter table work_announcements
  add column if not exists expires_at timestamptz;

update work_announcements
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table work_announcements
  alter column expires_at set default (now() + interval '7 days');

create index if not exists idx_work_announcements_expires_at
  on work_announcements (expires_at);
