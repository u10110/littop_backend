alter table author_profiles
  add column if not exists is_memorial_page boolean not null default false,
  add column if not exists peach_balance integer not null default 0,
  add column if not exists audio_upload_slots integer not null default 0;

alter table author_profiles
  drop constraint if exists author_profiles_peach_balance_nonnegative;
alter table author_profiles
  add constraint author_profiles_peach_balance_nonnegative check (peach_balance >= 0);

alter table author_profiles
  drop constraint if exists author_profiles_audio_upload_slots_nonnegative;
alter table author_profiles
  add constraint author_profiles_audio_upload_slots_nonnegative check (audio_upload_slots >= 0);

create table if not exists peach_transactions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  amount integer not null,
  kind text not null,
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_by_user_id bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint peach_transactions_amount_nonzero check (amount <> 0),
  constraint peach_transactions_kind_not_blank check (btrim(kind) <> '')
);

create index if not exists idx_peach_transactions_user_created_at
  on peach_transactions (user_id, created_at desc, id desc);

create table if not exists author_review_requests (
  id bigserial primary key,
  requester_user_id bigint not null references users(id) on delete cascade,
  work_id bigint references works(id) on delete set null,
  title text not null,
  message text,
  status text not null default 'pending',
  cost_peaches integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint author_review_requests_title_not_blank check (btrim(title) <> ''),
  constraint author_review_requests_status_not_blank check (btrim(status) <> ''),
  constraint author_review_requests_cost_nonnegative check (cost_peaches >= 0)
);

create index if not exists idx_author_review_requests_requester_created_at
  on author_review_requests (requester_user_id, created_at desc, id desc);
