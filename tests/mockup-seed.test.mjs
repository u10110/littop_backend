import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');
const migrationPath = resolve(backendDir, 'migrations/001_init.sql');
const seedPath = resolve(backendDir, 'migrations/002_mockup_seed.sql');

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

async function dockerExec(container, shellCommand) {
  return run('docker', ['exec', container, 'sh', '-lc', shellCommand]);
}

async function waitForDatabase(container) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      await dockerExec(container, 'psql -U postgres -d littop -c "select 1" >/dev/null 2>&1');
      return;
    } catch (error) {
      if (attempt === 89) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
    }
  }
}

test('mockup seed populates key demo entities from the layout', { timeout: 180000 }, async () => {
  const container = `littop-seed-test-${randomUUID().slice(0, 8)}`;

  try {
    await run('docker', ['run', '-d', '--name', container, '-e', 'POSTGRES_PASSWORD=postgres', '-e', 'POSTGRES_DB=littop', 'postgres:16-alpine']);

    await waitForDatabase(container);

    await run('sh', ['-lc', `docker exec -i ${container} psql -U postgres -d littop < ${migrationPath}`]);
    await run('sh', ['-lc', `docker exec -i ${container} psql -U postgres -d littop < ${seedPath}`]);

    const { stdout } = await dockerExec(container, `psql -U postgres -d littop -At -F '|' -c "
      select
        (select count(*) from users),
        (select count(*) from works),
        (select count(*) from forum_topics),
        (select count(*) from forum_posts),
        (select count(*) from contests),
        (select count(*) from radio_tracks),
        (select count(*) from work_comments),
        (select count(*) from work_ratings),
        (select count(*) from author_showcase_slots),
        (select count(*) from forum_sections),
        (select count(*) from radio_streams)
    "`);

    const [
      usersCount,
      worksCount,
      forumTopicsCount,
      forumPostsCount,
      contestsCount,
      radioTracksCount,
      workCommentsCount,
      workRatingsCount,
      showcaseCount,
      forumSectionsCount,
      radioStreamsCount,
    ] = stdout.trim().split('|').map(Number);

    assert.equal(usersCount, 44);
    assert.equal(worksCount, 15);
    assert.equal(forumTopicsCount, 6);
    assert.equal(forumPostsCount, 12);
    assert.equal(contestsCount, 6);
    assert.equal(radioTracksCount, 3);
    assert.equal(workCommentsCount, 3);
    assert.equal(workRatingsCount, 6);
    assert.equal(showcaseCount, 5);
    assert.equal(forumSectionsCount, 4);
    assert.equal(radioStreamsCount, 1);

    const { stdout: probes } = await dockerExec(container, `psql -U postgres -d littop -At -F '|' -c "
      select (select display_name from author_profiles ap join users u on u.id = ap.user_id where u.login = 'Stan242'),
             (select title from works where title = 'Сказание о шаманке Нини' limit 1),
             (select title from forum_topics where title = 'Свои причины промолчать (ТМ)' limit 1),
             (select title from contests where title = 'Здесь начинается Россия' limit 1),
             (select title from radio_tracks where title = 'Улыбка' limit 1)
    "`);

    const [authorName, workTitle, topicTitle, contestTitle, radioTitle] = probes.trim().split('|');
    assert.equal(authorName, 'Олег Сталь');
    assert.equal(workTitle, 'Сказание о шаманке Нини');
    assert.equal(topicTitle, 'Свои причины промолчать (ТМ)');
    assert.equal(contestTitle, 'Здесь начинается Россия');
    assert.equal(radioTitle, 'Улыбка');
  } finally {
    await run('docker', ['rm', '-f', container]).catch(() => {});
  }
});
