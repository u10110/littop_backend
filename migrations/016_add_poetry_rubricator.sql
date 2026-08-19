with poetry as (
  select id from work_sections where code = 'poetry'
), genres(slug, name, sort_order) as (
  values
    ('acrostics', 'Акростихи', 10),
    ('aphorisms', 'Афоризмы', 20),
    ('ballads', 'Баллады', 30),
    ('fables', 'Басни', 40),
    ('blank-and-free-verse', 'Белый и вольный стих', 50),
    ('vers-libre', 'Верлибр', 60),
    ('decadent-poetry', 'Декадентская поэзия', 70),
    ('verse-dramas', 'Драмы в стихах', 80),
    ('other-poetry', 'Другое', 90),
    ('ironic-poetry', 'Иронические стихи', 100),
    ('historical-poetry', 'Исторические стихи', 110),
    ('urban-lyrics', 'Лирика городская', 120),
    ('civic-lyrics', 'Лирика гражданская', 130),
    ('love-lyrics', 'Лирика любовная', 140),
    ('landscape-lyrics', 'Лирика пейзажная', 150),
    ('religious-lyrics', 'Лирика религиозная', 160),
    ('philosophical-lyrics', 'Лирика философская', 170),
    ('obscene-poetry', 'Матерные стихи', 180),
    ('world-of-soul', 'Мир души', 190),
    ('mystical-poetry', 'Мистическая поэзия', 200),
    ('nonformat-poetry', 'Неформат', 210),
    ('imitations-and-parodies', 'Подражания и пародии', 220),
    ('poems-and-cycles', 'Поэмы и циклы стихов', 230),
    ('poetic-manifestos', 'Поэтические манифесты', 240),
    ('poetic-translations', 'Поэтические переводы', 250),
    ('prose-miniatures', 'Прозаические миниатюры', 260),
    ('satirical-poetry', 'Сатирические стихи', 270),
    ('poems-in-prose', 'Стихи в прозе', 280),
    ('poetry-for-children', 'Стихи для детей', 290),
    ('poetry-of-famous-authors', 'Стихи известных поэтов', 300),
    ('poetry-in-foreign-languages', 'Стихи на иностранных языках', 310),
    ('war-poetry', 'Стихи о войне', 320),
    ('author-video-poetry', 'Стихи с видео (авторские)', 330),
    ('unclassified-poetry', 'Стихи, не вошедшие в рубрики', 340),
    ('fixed-forms', 'Твердые формы', 350),
    ('haiku-tanka-rubai', 'Хокку, танка, рубаи', 360),
    ('artistic-poetry-reading', 'Художественное чтение стихов', 370),
    ('chastushki', 'Частушки', 380),
    ('comic-poetry', 'Шуточные стихи', 390),
    ('esoteric-poetry', 'Эзотерические стихи', 400),
    ('experimental-poetry', 'Экспериментальная поэзия', 410),
    ('emigrant-poetry', 'Эмигрантская поэзия', 420),
    ('epigrams', 'Эпиграммы', 430),
    ('erotic-poetry', 'Эротические стихи', 440),
    ('humorous-poetry', 'Юмористические стихи', 450)
)
insert into work_genres (section_id, slug, name, sort_order)
select poetry.id, genres.slug, genres.name, genres.sort_order
from poetry
cross join genres
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;
