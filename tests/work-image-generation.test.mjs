import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkImagePrompt,
  generateMissingWorkImages,
} from '../src/workImageGeneration.mjs';

test('dry run selects only works without an image and never calls the image generator', async () => {
  const works = [
    { id: 1, title: 'Без обложки', summary: 'Туманное утро', body: 'Текст' },
    { id: 2, title: 'Ручная обложка', imageUrl: 'https://cdn.example/manual.jpg' },
    { id: 3, title: 'Сгенерированная ранее', imageUrl: 'https://cdn.example/generated.png' },
  ];
  const calls = { generate: 0, save: 0 };

  const result = await generateMissingWorkImages({
    works,
    dryRun: true,
    generateImage: async () => { calls.generate += 1; },
    saveGeneratedImage: async () => { calls.save += 1; },
  });

  assert.deepEqual(result, { selected: 1, generated: 0, skipped: 0, failed: 0 });
  assert.equal(calls.generate, 0);
  assert.equal(calls.save, 0);
});

test('generation saves an image only when the conditional database update accepts it', async () => {
  const saved = [];
  const result = await generateMissingWorkImages({
    works: [{ id: 7, title: 'Осенний сад', summary: 'Тихий сад после дождя' }],
    generateImage: async () => ({ bytes: Buffer.from('png'), mimeType: 'image/png', extension: '.png' }),
    saveGeneratedImage: async (work, image) => {
      saved.push({ work, image });
      return { applied: true, imageUrl: 'https://example.test/media/works/work-ai-7.png' };
    },
  });

  assert.deepEqual(result, { selected: 1, generated: 1, skipped: 0, failed: 0 });
  assert.equal(saved.length, 1);
  assert.match(buildWorkImagePrompt({ title: 'Осенний сад', summary: 'Тихий сад после дождя' }), /Осенний сад/);
  assert.match(buildWorkImagePrompt({ title: 'Осенний сад' }), /передай настроение названия/i);
});

test('a concurrent manual upload wins over a generated image', async () => {
  const result = await generateMissingWorkImages({
    works: [{ id: 9, title: 'Берег' }],
    generateImage: async () => ({ bytes: Buffer.from('png'), mimeType: 'image/png', extension: '.png' }),
    saveGeneratedImage: async () => ({ applied: false }),
  });

  assert.deepEqual(result, { selected: 1, generated: 0, skipped: 1, failed: 0 });
});
