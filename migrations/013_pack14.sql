-- Pack 14: колонка редактора, настраиваемая картинка шапки сайта,
-- прикрепление картинок к темам форума и флаг "вывести на главную".

-- 1. Секция "Колонка редактора" (создаём, если ещё нет).
insert into forum_sections (slug, name, description, sort_order)
values ('editor-column', 'Колонка редактора', 'Авторские материалы редакции, выносимые на главную страницу.', 60)
on conflict (slug) do nothing;

-- 2. Картинка, прикрепляемая к ЛЮБОЙ теме форума.
alter table forum_topics add column if not exists image_url text;

-- 3. Флаг "вывести на главную" (только для тем колонки редактора, выставляется редакторами/админами).
alter table forum_topics add column if not exists featured_main boolean not null default false;
create index if not exists idx_forum_topics_featured_main on forum_topics (featured_main) where featured_main = true;

-- 4. Настраиваемая картинка в шапке сайта (таблица site_settings уже создана в Pack-13).
insert into site_settings (key, value) values
  ('headerBannerTitle', 'Литопотам — пишем вместе'),
  ('headerBannerSubtitle', 'Площадка для авторов, переводчиков и редакторов'),
  ('headerImageUrl', '')
on conflict (key) do nothing;
