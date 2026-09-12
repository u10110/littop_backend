#!/usr/bin/env node
import 'dotenv/config';
import process from 'node:process';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';
import { createPool } from '../src/db.mjs';
import { uploadFile, resolveWorkMediaStorageDir } from '../src/httpServer.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 25;
if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
  console.error('--limit must be an integer from 1 to 500');
  process.exit(2);
}
const databaseUrl = String(process.env.DATABASE_URL || '').trim().replace(/\s+#.*$/, '');
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(2);
}
const pool = createPool(databaseUrl);
const baseUrl = String(process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, '');
function publicUrl(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) ? text : `${baseUrl}${text.startsWith('/') ? text : `/${text}`}`;
}
try {
  const { rows } = await pool.query(`
    select id, image_url, image_preview_url
      from works
     where coalesce(nullif(btrim(image_url), ''), '') <> ''
       and coalesce(nullif(btrim(image_preview_url), ''), '') = ''
       and status <> 'archived'
     order by id asc
     limit $1`, [limit]);
  console.log(`[preview] selected=${rows.length} dryRun=${dryRun}`);
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const work of rows) {
    if (dryRun) {
      console.log(`[dry-run] work=${work.id}`);
      continue;
    }
    try {
      const response = await fetch(publicUrl(work.image_url));
      if (!response.ok) throw new Error(`original returned HTTP ${response.status}`);
      const preview = await sharp(Buffer.from(await response.arrayBuffer()))
        .resize({ width: 320, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();
      const originalName = basename(String(work.image_url).split('?')[0]);
      const stem = originalName
        .slice(0, Math.max(1, originalName.length - extname(originalName).length))
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .slice(0, 80);
      const fileName = `work-preview-${work.id}-${stem || 'image'}.webp`;
      const storagePath = `/media/works/${fileName}`;
      await uploadFile(storagePath, preview, 'image/webp', {
        env: process.env,
        localPath: join(resolveWorkMediaStorageDir(process.env), fileName),
      });
      const update = await pool.query(`
        update works
           set image_preview_url = $1, updated_at = now()
         where id = $2
           and coalesce(nullif(btrim(image_url), ''), '') <> ''
           and coalesce(nullif(btrim(image_preview_url), ''), '') = ''`, [storagePath, work.id]);
      if (update.rowCount !== 1) {
        skipped += 1;
        console.log(`[skipped] work=${work.id}`);
      } else {
        generated += 1;
        console.log(`[generated] work=${work.id} preview=${storagePath}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[failed] work=${work.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(JSON.stringify({ selected: rows.length, generated, skipped, failed }));
  if (failed) process.exitCode = 1;
} finally {
  await pool.end();
}
