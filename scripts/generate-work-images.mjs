#!/usr/bin/env node
import 'dotenv/config';

import process from 'node:process';
import { createPool } from '../src/db.mjs';
import {
  generateImageWithCodexSale,
  generateMissingWorkImages,
  saveGeneratedWorkImage,
} from '../src/workImageGeneration.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitValue = args.find((arg) => arg.startsWith('--limit='));
const statusValue = args.find((arg) => arg.startsWith('--status='));
const workIdValue = args.find((arg) => arg.startsWith('--work-id='));
const unknown = args.filter((arg) => arg !== '--dry-run' && !arg.startsWith('--limit=') && !arg.startsWith('--status=') && !arg.startsWith('--work-id='));
if (unknown.length) { console.error(`Unknown option(s): ${unknown.join(', ')}`); process.exit(2); }
const limit = limitValue ? Number(limitValue.slice('--limit='.length)) : 10;
if (!Number.isInteger(limit) || limit < 1 || limit > 100) { console.error('--limit must be an integer from 1 to 100'); process.exit(2); }
const status = statusValue ? statusValue.slice('--status='.length).trim() : null;
const workId = workIdValue ? workIdValue.slice('--work-id='.length).trim() : null;
if (workIdValue && (!workId || !/^\d+$/.test(workId))) { console.error('--work-id must be a positive integer'); process.exit(2); }
const databaseUrl = String(process.env.DATABASE_URL || '').trim().replace(/\s+#.*$/, '');
if (!databaseUrl) { console.error('DATABASE_URL is required'); process.exit(2); }
if (!dryRun && !String(process.env.CODEX_SALE_API_KEY || '').trim()) { console.error('CODEX_SALE_API_KEY is required unless --dry-run is used'); process.exit(2); }

const pool = createPool(databaseUrl);
try {
  const params = [];
  const conditions = ["coalesce(nullif(btrim(w.image_url), ''), '') = ''"];
  if (workId) { params.push(workId); conditions.push(`w.id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`w.status = $${params.length}`); }
  else conditions.push("w.status <> 'archived'");
  params.push(limit);
  const { rows: works } = await pool.query(
    `select w.*, ws.code as section_code, wg.slug as genre_slug,
            u.id as author_id, u.email as author_email, u.login as author_login,
            u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
            u.created_at as author_created_at, u.updated_at as author_updated_at,
            ap.display_name as author_display_name, ap.bio as author_bio,
            ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url,
            ap.city as author_city, ap.website_url as author_website_url,
            ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
            ap.works_count_cached as author_works_count_cached,
            ap.is_classic as author_is_classic, ap.is_memorial_page as author_is_memorial_page,
            ap.is_featured as author_is_featured
       from works w
       join work_sections ws on ws.id = w.section_id
       left join work_genres wg on wg.id = w.genre_id
       join users u on u.id = w.author_user_id
       left join author_profiles ap on ap.user_id = u.id
      where ${conditions.join(' and ')}
      order by coalesce(w.published_at, w.created_at) desc
      limit $${params.length}`,
    params,
  );
  const result = await generateMissingWorkImages({
    works: works.map((work) => ({ ...work, imageUrl: work.image_url, title: work.title, summary: work.summary, body: work.body })),
    dryRun,
    generateImage: (prompt) => generateImageWithCodexSale({ prompt, env: process.env }),
    saveGeneratedImage: async (work, image) => {
      const saved = await saveGeneratedWorkImage({
        workId: work.id,
        image,
        repo: {
          setGeneratedWorkImage: async ({ workId, imageUrl, imagePreviewUrl = null }) => {
            const update = await pool.query(
              `update works set image_url = $1, image_preview_url = $2, updated_at = now()
                where id = $3 and coalesce(nullif(btrim(image_url), ''), '') = ''
                returning id, image_url, image_preview_url`,
              [imageUrl, imagePreviewUrl, workId],
            );
            return update.rowCount === 1;
          },
        },
        env: process.env,
      });
      return { ...saved, applied: Boolean(saved.applied) };
    },
    onResult: ({ work, status: resultStatus, error }) => console.log(`[${resultStatus}] work=${work.id} title=${JSON.stringify(work.title)}${error ? `: ${error}` : ''}`),
  });
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
} finally { await pool.end(); }
