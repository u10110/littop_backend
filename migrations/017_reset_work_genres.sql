begin;

delete from work_genres;

with genres(section_code, slug, name, sort_order) as (
  values
    ('poetry',  'lyrics',                  'Лирика',                     10),
    ('poetry',  'civic-poetry',            'Гражданская поэзия',         20),
    ('poetry',  'landscape-poetry',        'Пейзажная поэзия',           30),
    ('poetry',  'free-verse',              'Верлибр',                    40),
    ('prose',   'story',                   'Рассказ',                    10),
    ('prose',   'novella-novel',           'Повесть и роман',            20),
    ('prose',   'essay-memoir',            'Эссе и мемуары',             30),
    ('prose',   'fantasy',                 'Фантастика и фэнтези',       40),
    ('prose',   'detective',               'Детектив',                   50),
    ('project', 'song-and-recitation',     'Песни и декламации',         10),
    ('project', 'screenplay',              'Сценарий и постановка',      20),
    ('project', 'literary-criticism',      'Критика и литературоведение',30),
    ('project', 'audio-book',              'Аудиопроизведение',          40)
)
insert into work_genres (section_id, slug, name, sort_order)
select ws.id, genres.slug, genres.name, genres.sort_order
from genres
join work_sections ws on ws.code::text = genres.section_code;

commit;
