-- Make work collections author-owned so admin transfers have a real destination.
ALTER TABLE work_collections
  ADD COLUMN IF NOT EXISTS author_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Backfill only unambiguous legacy collections. Mixed/empty collections stay
-- unowned and therefore cannot be used as an inter-account transfer source.
UPDATE work_collections wc
SET author_user_id = owners.author_user_id
FROM (
  SELECT wci.collection_id, min(w.author_user_id) AS author_user_id
  FROM work_collection_items wci
  JOIN works w ON w.id = wci.work_id
  GROUP BY wci.collection_id
  HAVING count(*) > 0 AND count(DISTINCT w.author_user_id) = 1
) owners
WHERE wc.id = owners.collection_id AND wc.author_user_id IS NULL;

CREATE INDEX IF NOT EXISTS work_collections_author_user_id_idx
  ON work_collections(author_user_id);