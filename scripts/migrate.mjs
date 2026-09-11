#!/usr/bin/env node
import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const baseline = args.has('--baseline');
const unknownArgs = [...args].filter((arg) => !['--dry-run', '--baseline'].includes(arg));

if (unknownArgs.length) {
  console.error(`Unknown option(s): ${unknownArgs.join(', ')}`);
  process.exit(2);
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim().replace(/\s+#.*$/, '');
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(2);
}

const migrationsDir = resolve(process.cwd(), 'migrations');
const files = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => {
    const leftNumber = Number(left.match(/^\d+/)?.[0] || 0);
    const rightNumber = Number(right.match(/^\d+/)?.[0] || 0);
    return leftNumber - rightNumber || left.localeCompare(right, 'en');
  });

const migrations = await Promise.all(files.map(async (name) => {
  const source = await readFile(resolve(migrationsDir, name), 'utf8');
  // Existing files use standalone BEGIN/COMMIT lines. Remove only those lines so
  // the runner can provide one transaction for SQL plus its journal entry.
  const sql = source.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gim, '').trim();
  return { name, sql, checksum: createHash('sha256').update(source).digest('hex') };
}));

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query('select pg_advisory_lock(hashtext($1))', ['littop-schema-migrations']);
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await client.query('select name, checksum from schema_migrations order by name');
  const applied = new Map(rows.map((row) => [row.name, row.checksum]));
  const changed = migrations.filter((migration) => applied.has(migration.name) && applied.get(migration.name) !== migration.checksum);
  if (changed.length) {
    throw new Error(`Migration checksum changed after application: ${changed.map((migration) => migration.name).join(', ')}`);
  }

  const pending = migrations.filter((migration) => !applied.has(migration.name));
  if (baseline) {
    if (dryRun) {
      console.log(`Would baseline ${pending.length} migration(s):`);
      pending.forEach((migration) => console.log(`  ${migration.name}`));
      process.exitCode = 0;
    } else {
      await client.query('begin');
      try {
        for (const migration of pending) {
          await client.query('insert into schema_migrations (name, checksum) values ($1, $2)', [migration.name, migration.checksum]);
        }
        await client.query('commit');
        console.log(`Baselined ${pending.length} migration(s). No SQL migration files were executed.`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } else if (!pending.length) {
    console.log('Database schema is up to date.');
  } else if (dryRun) {
    console.log(`Would apply ${pending.length} migration(s):`);
    pending.forEach((migration) => console.log(`  ${migration.name}`));
  } else {
    for (const migration of pending) {
      console.log(`Applying ${migration.name}...`);
      await client.query('begin');
      try {
        await client.query(migration.sql);
        await client.query('insert into schema_migrations (name, checksum) values ($1, $2)', [migration.name, migration.checksum]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`${migration.name}: ${error.message}`);
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  }
} finally {
  await client.query('select pg_advisory_unlock(hashtext($1))', ['littop-schema-migrations']).catch(() => {});
  await client.end();
}
