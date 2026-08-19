alter table author_profiles
  add column if not exists can_receive_private_messages boolean not null default true;

update author_profiles ap
set can_receive_private_messages = false
from users u
where u.id = ap.user_id
  and u.login in (
    'alexander-pushkin',
    'alexander-blok',
    'sergey-esenin',
    'bulat-okudzhava',
    'vladimir-vysotsky'
  );
