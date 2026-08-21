with prose as (
  select id from work_sections where code = 'prose'
),
genres(slug, name, sort_order) as (
  values
    ('story', 'Рассказ', 10),
    ('novella-novel', 'Повесть и роман', 20),
    ('essays-memoirs', 'Эссе и мемуары', 30),
    ('science-fiction-fantasy', 'Фантастика и фэнтези', 40),
    ('detective', 'Детектив', 50),
    ('historical-prose', 'Историческая проза', 60)
)
insert into work_genres (section_id, slug, name, sort_order)
select prose.id, genres.slug, genres.name, genres.sort_order
from prose
cross join genres
on conflict (slug) do update
set section_id = excluded.section_id,
    name = excluded.name,
    sort_order = excluded.sort_order;
