import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const REPOSITORY_PATH = new URL('../src/postgresRepository.mjs', import.meta.url);

// Л2-10: удалённые (archived) произведения не должны попадать в список кабинета.
// Кабинет запрашивает works(status: null) — «все мои, кроме архивных».
// Регрессия: раньше status:null не фильтровал ничего, и болтались удалённые.
test('listWorks со status:null скрывает архивные произведения (SQL-инвариант)', async () => {
  const source = await readFile(REPOSITORY_PATH, 'utf8');
  // Ветка else после if (status) внутри listWorks должна добавлять w.status <> 'archived'
  const listWorksBody = source.slice(
    source.indexOf('async listWorks('),
    source.indexOf('async listWorksForImageGeneration('),
  );
  assert.ok(listWorksBody.length > 0, 'тело listWorks найдено');
  assert.match(
    listWorksBody,
    /if \(status\) \{[\s\S]*?\} else \{[\s\S]*?w\.status <> 'archived'[\s\S]*?\}/,
    'listWorks: else-ветка для status:null добавляет условие w.status <> \'archived\'',
  );
  // Явный статус по-прежнему фильтруется точным равенством (кабинет черновиков, радио и т.д.)
  assert.match(
    listWorksBody,
    /if \(status\) \{\s*params\.push\(status\);\s*conditions\.push\(`w\.status = \$\$\{params\.length\}`\);/,
  );
});

// Л2-10 (смежное): кэш счётчика произведений не считает архивные.
test('works_count_cached не учитывает архивные произведения', async () => {
  const source = await readFile(REPOSITORY_PATH, 'utf8');
  const matches = source.match(/works_count_cached = \([\s\S]*?from works[\s\S]*?status <> 'archived'/g) || [];
  assert.ok(
    matches.length >= 1,
    `найдено ${matches.length} пересчётов works_count_cached со статус-фильтром, ожидалось >= 1`,
  );
});
