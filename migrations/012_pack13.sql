-- Pack 13: radio track authorship + editable site header text

alter table radio_tracks add column if not exists creator_user_id bigint references users(id) on delete set null;

create table if not exists site_settings (
  key text primary key,
  value text
);
