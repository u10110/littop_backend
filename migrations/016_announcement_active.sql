-- Pack 18 fix: announcement_active column was referenced by repository code
-- but missing from schema. Add it. Idempotent.
alter table works add column if not exists announcement_active boolean not null default false;
