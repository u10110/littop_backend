-- Retain legacy audio_url/audio_file_name while adding ordered multi-track audio.
alter table works
  add column if not exists audio_tracks jsonb not null default '[]'::jsonb;
