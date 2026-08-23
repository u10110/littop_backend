create table if not exists author_work_groups (
  id bigint generated always as identity primary key,
  author_user_id bigint not null references users(id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint author_work_groups_name_not_blank check (btrim(name) <> ''),
  constraint author_work_groups_position_nonnegative check (position >= 0)
);
create index if not exists author_work_groups_author_position_idx on author_work_groups(author_user_id, position, id);
create table if not exists author_work_group_items (
  group_id bigint not null references author_work_groups(id) on delete cascade,
  work_id bigint not null references works(id) on delete cascade,
  position integer not null default 0,
  primary key (group_id, work_id),
  constraint author_work_group_items_position_nonnegative check (position >= 0)
);
create index if not exists author_work_group_items_group_position_idx on author_work_group_items(group_id, position, work_id);
