-- Home-page data sources: explicit work announcements and efficient recent comments.
create table if not exists work_announcements (
  id bigserial primary key,
  work_id bigint not null unique references works(id) on delete cascade,
  activated_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists work_announcements_created_at_idx
  on work_announcements (created_at desc, id desc);

create index if not exists work_comments_visible_created_at_idx
  on work_comments (created_at desc)
  where status = 'visible';
