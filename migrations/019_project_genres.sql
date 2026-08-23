BEGIN;
WITH project AS (SELECT id FROM work_sections WHERE code = 'project'), legacy(slug, name, sort_order) AS (
 VALUES ('song','Песня',10),('presentation','Презентация',20),('stage-production','Постановка',30),('screenplay','Киносценарий',40),('other-project','Другое',50)
)
INSERT INTO work_genres(section_id, slug, name, sort_order)
SELECT project.id, legacy.slug, legacy.name, legacy.sort_order FROM project CROSS JOIN legacy
ON CONFLICT (slug) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order;
UPDATE works w
SET genre_id = wg.id
FROM work_sections ws JOIN work_genres wg ON wg.section_id=ws.id
WHERE w.section_id=ws.id AND ws.code='project' AND w.genre_id IS NULL
  AND wg.slug = CASE w.project_format
    WHEN 'song' THEN 'song' WHEN 'presentation' THEN 'presentation'
    WHEN 'stage_production' THEN 'stage-production' WHEN 'screenplay' THEN 'screenplay'
    WHEN 'other' THEN 'other-project' ELSE NULL END;
COMMIT;
