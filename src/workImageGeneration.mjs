import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import sharp from 'sharp';

import { uploadFile, resolveWorkMediaStorageDir } from './httpServer.mjs';

const DEFAULT_MODEL = 'gpt-image-2';
const DEFAULT_ENDPOINT = 'https://codex.sale/v1/images/generations';
const IMAGE_MIME_TYPES = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
]);

function trimText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function buildWorkImagePrompt(work) {
  const title = trimText(work?.title, 240) || 'Литературное произведение';
  const summary = trimText(work?.summary || work?.excerpt || work?.body, 1_200);
  return [
    'Создай атмосферную художественную иллюстрацию для обложки литературного произведения.',
    `Название: «${title}».`,
    summary ? `Смысловой ориентир: ${summary}` : 'Смысловой ориентир: передай настроение названия.',
    'Без надписей, букв, цифр, логотипов, водяных знаков, рамок и коллажей. Вертикальная композиция, выразительный книжный стиль.',
  ].join(' ');
}

function imageExtension(mimeType) {
  return IMAGE_MIME_TYPES.get(String(mimeType || '').toLowerCase()) || '.png';
}

function decodeBase64Image(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const dataUrl = raw.match(/^data:([^;]+);base64,(.+)$/i);
  const mimeType = dataUrl?.[1]?.toLowerCase() || 'image/png';
  const encoded = dataUrl?.[2] || raw;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
  return bytes.length ? { mimeType, bytes } : null;
}

export async function generateImageWithCodexSale({ prompt, env, fetchImpl = globalThis.fetch }) {
  const apiKey = String(env.CODEX_SALE_API_KEY || '').trim();
  if (!apiKey) throw new Error('CODEX_SALE_API_KEY is required');
  const endpoint = String(env.CODEX_SALE_IMAGE_ENDPOINT || DEFAULT_ENDPOINT).trim();
  const model = String(env.CODEX_SALE_IMAGE_MODEL || DEFAULT_MODEL).trim();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1024x1536', quality: 'medium', n: 1 }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(body?.error?.message || body?.message || `Image API returned HTTP ${response.status}`).slice(0, 500);
    throw new Error(message);
  }
  const item = body?.data?.[0];
  const fromBase64 = decodeBase64Image(item?.b64_json);
  if (fromBase64?.bytes?.length) return { ...fromBase64, extension: imageExtension(fromBase64.mimeType) };
  if (item?.url) {
    const imageResponse = await fetchImpl(item.url);
    if (!imageResponse.ok) throw new Error(`Generated image download returned HTTP ${imageResponse.status}`);
    const mimeType = String(imageResponse.headers.get('content-type') || 'image/png').split(';')[0].trim().toLowerCase();
    return { bytes: Buffer.from(await imageResponse.arrayBuffer()), mimeType, extension: imageExtension(mimeType) };
  }
  throw new Error('Image API did not return image data');
}

export async function saveGeneratedWorkImage({ workId, image, repo, env }) {
  const fileName = `work-ai-${workId}-${Date.now()}-${randomUUID()}${image.extension || imageExtension(image.mimeType)}`;
  const previewFileName = `work-preview-${workId}-${Date.now()}-${randomUUID()}.webp`;
  const storagePath = `/media/works/${fileName}`;
  const previewStoragePath = `/media/works/${previewFileName}`;
  const previewBytes = await sharp(image.bytes).resize({ width: 320, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  await uploadFile(storagePath, image.bytes, image.mimeType, { env, localPath: join(resolveWorkMediaStorageDir(env), fileName) });
  await uploadFile(previewStoragePath, previewBytes, 'image/webp', { env, localPath: join(resolveWorkMediaStorageDir(env), previewFileName) });
  const applied = await repo.setGeneratedWorkImage({ workId, imageUrl: storagePath, imagePreviewUrl: previewStoragePath });
  return { applied, imageUrl: storagePath, imagePreviewUrl: previewStoragePath };
}

export async function generateMissingWorkImages({ works, dryRun = false, generateImage, saveGeneratedImage, onResult = () => {} }) {
  const candidates = works.filter((work) => !String(work?.imageUrl || '').trim());
  const summary = { selected: candidates.length, generated: 0, skipped: 0, failed: 0 };
  for (const work of candidates) {
    if (dryRun) {
      onResult({ work, status: 'dry-run' });
      continue;
    }
    try {
      const image = await generateImage(buildWorkImagePrompt(work), work);
      const saved = await saveGeneratedImage(work, image);
      if (saved?.applied) {
        summary.generated += 1;
        onResult({ work, status: 'generated', imageUrl: saved.imageUrl });
      } else {
        summary.skipped += 1;
        onResult({ work, status: 'skipped' });
      }
    } catch (error) {
      summary.failed += 1;
      onResult({ work, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return summary;
}
