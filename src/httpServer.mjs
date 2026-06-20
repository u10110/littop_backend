import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer as createNodeHttpServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { parse as parseUrl } from 'node:url';
import { randomUUID } from 'node:crypto';

import { HeaderMap } from '@apollo/server';

import { buildContext } from './createServer.mjs';
import {
  buildSocialAuthFailureRedirect,
  buildSocialAuthStartRedirect,
  completeSocialAuthCallback,
  extractSocialCallbackParams,
  isSupportedSocialProvider,
  SocialAuthError,
} from './socialAuth.mjs';

const AUDIO_UPLOAD_ENDPOINT = '/api/radio/upload';
const AUDIO_PUBLIC_PATH_PREFIX = '/media/audio/';
const AUDIO_FILE_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const PROFILE_IMAGE_UPLOAD_ENDPOINT = '/api/profile/upload-image';
const PROFILE_PUBLIC_PATH_PREFIX = '/media/profile/';
const DISCUSSION_IMAGE_UPLOAD_ENDPOINT = '/api/forum/upload-image';
const DISCUSSION_PUBLIC_PATH_PREFIX = '/media/forum/';
const IMAGE_FILE_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;
const AUDIO_EXTENSION_BY_MIME = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
};
const AUDIO_CONTENT_TYPE_BY_EXTENSION = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
};
const IMAGE_EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const IMAGE_CONTENT_TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end(message);
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('location', location);
  res.end();
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return undefined;
  return JSON.parse(raw);
}

function copyGraphqlResponse(res, httpGraphQLResponse) {
  for (const [key, value] of httpGraphQLResponse.headers) {
    res.setHeader(key, value);
  }
  res.statusCode = httpGraphQLResponse.status || 200;
}

function resolvePublicBaseUrl(req, env) {
  const configured = String(env.PUBLIC_BASE_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const protocol = String(req.headers['x-forwarded-proto'] || '').trim() || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').trim();
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function resolveAudioStorageDir(env) {
  const configured = String(env.AUDIO_UPLOAD_DIR || '').trim();
  return configured ? resolve(configured) : resolve(process.cwd(), 'uploads', 'audio');
}

function resolveProfileStorageDir(env) {
  const configured = String(env.PROFILE_UPLOAD_DIR || '').trim();
  return configured ? resolve(configured) : resolve(process.cwd(), 'uploads', 'profile');
}

function resolveDiscussionStorageDir(env) {
  const configured = String(env.DISCUSSION_UPLOAD_DIR || '').trim();
  return configured ? resolve(configured) : resolve(process.cwd(), 'uploads', 'forum');
}

function sanitizeStoredBaseName(filename) {
  return String(filename || '')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'track';
}

function detectAudioExtension({ mimeType, fileName }) {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (AUDIO_EXTENSION_BY_MIME[normalizedMimeType]) {
    return AUDIO_EXTENSION_BY_MIME[normalizedMimeType];
  }

  const normalizedExtension = extname(String(fileName || '').trim()).toLowerCase();
  if (AUDIO_CONTENT_TYPE_BY_EXTENSION[normalizedExtension]) {
    return normalizedExtension;
  }

  throw new Error('Поддерживаются только аудиофайлы mp3, wav, ogg, webm, m4a, aac и flac.');
}

function decodeBase64Audio(rawValue) {
  const normalized = String(rawValue || '')
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '');

  if (!normalized) {
    throw new Error('Файл не передан.');
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Некорректный формат аудиофайла.');
  }

  const buffer = Buffer.from(normalized, 'base64');
  if (!buffer.length) {
    throw new Error('Аудиофайл пустой.');
  }
  if (buffer.length > AUDIO_FILE_SIZE_LIMIT_BYTES) {
    throw new Error('Аудиофайл слишком большой. Максимум 20 МБ.');
  }
  return buffer;
}

function detectImageExtension({ mimeType, fileName }) {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (IMAGE_EXTENSION_BY_MIME[normalizedMimeType]) {
    return IMAGE_EXTENSION_BY_MIME[normalizedMimeType];
  }

  const normalizedExtension = extname(String(fileName || '').trim()).toLowerCase();
  if (IMAGE_CONTENT_TYPE_BY_EXTENSION[normalizedExtension]) {
    return normalizedExtension === '.jpeg' ? '.jpg' : normalizedExtension;
  }

  throw new Error('Поддерживаются только изображения JPG, PNG, WEBP и GIF.');
}

function decodeBase64Image(rawValue) {
  const normalized = String(rawValue || '')
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '');

  if (!normalized) {
    throw new Error('Изображение не передано.');
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Некорректный формат изображения.');
  }

  const buffer = Buffer.from(normalized, 'base64');
  if (!buffer.length) {
    throw new Error('Изображение пустое.');
  }
  if (buffer.length > IMAGE_FILE_SIZE_LIMIT_BYTES) {
    throw new Error('Изображение слишком большое. Максимум 10 МБ.');
  }
  return buffer;
}

function normalizeProfileImageKind(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'avatar' || normalized === 'cover') {
    return normalized;
  }
  throw new Error('kind must be avatar or cover');
}

async function handleGraphqlRequest({ req, res, apolloServer, repo, jwtSecret, adminUserIds }) {
  const headers = new HeaderMap();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }

  const body = req.method === 'GET' ? undefined : await readJsonBody(req);
  const httpGraphQLRequest = {
    method: req.method.toUpperCase(),
    headers,
    search: parseUrl(req.url).search ?? '',
    body,
  };

  const response = await apolloServer.executeHTTPGraphQLRequest({
    httpGraphQLRequest,
    context: () => buildContext({ req }, { repo, jwtSecret, adminUserIds }),
  });

  copyGraphqlResponse(res, response);
  if (response.body.kind === 'complete') {
    res.end(response.body.string);
    return;
  }

  for await (const chunk of response.body.asyncIterator) {
    res.write(chunk);
  }
  res.end();
}

function matchSocialAuthRoute(pathname) {
  const match = pathname.match(/^\/auth\/social\/([^/]+)\/(start|callback)$/);
  if (!match) return null;
  return {
    provider: match[1],
    action: match[2],
  };
}

async function handleSocialAuthRequest({ req, res, pathname, searchParams, repo, jwtSecret, env, fetchImpl }) {
  const route = matchSocialAuthRoute(pathname);
  if (!route) {
    return false;
  }

  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  if (!isSupportedSocialProvider(route.provider)) {
    sendText(res, 404, 'Social auth provider not found');
    return true;
  }

  if (route.action === 'start') {
    const mode = searchParams.get('mode') || 'login';
    const redirectUri = searchParams.get('redirect_uri') || '';

    try {
      const providerRedirect = buildSocialAuthStartRedirect({
        provider: route.provider,
        mode,
        redirectUri,
        req,
        jwtSecret,
        env,
      });
      redirect(res, providerRedirect);
    } catch (error) {
      if (redirectUri) {
        try {
          const frontendRedirect = buildSocialAuthFailureRedirect({
            provider: route.provider,
            mode,
            redirectUri,
            error: error instanceof Error ? error.message : 'Не удалось начать соцвход.',
          });
          redirect(res, frontendRedirect);
          return true;
        } catch {
          // fall back to plain text response below
        }
      }

      const statusCode = error instanceof SocialAuthError ? error.statusCode : 500;
      sendText(res, statusCode, error instanceof Error ? error.message : 'Не удалось начать соцвход.');
    }
    return true;
  }

  try {
    const { code, stateToken, providerError } = extractSocialCallbackParams(searchParams);
    const frontendRedirect = await completeSocialAuthCallback({
      provider: route.provider,
      stateToken,
      code,
      providerError,
      repo,
      jwtSecret,
      req,
      env,
      fetchImpl,
    });
    redirect(res, frontendRedirect);
  } catch (error) {
    const statusCode = error instanceof SocialAuthError ? error.statusCode : 500;
    sendText(res, statusCode, error instanceof Error ? error.message : 'Не удалось завершить соцвход.');
  }

  return true;
}

async function handleRadioUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env }) {
  if (pathname !== AUDIO_UPLOAD_ENDPOINT) {
    return false;
  }

  if (req.method !== 'POST') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const context = await buildContext({ req }, { repo, jwtSecret, adminUserIds });
  if (!context.currentUser) {
    sendJson(res, 401, { error: 'Authentication required' });
    return true;
  }

  const body = await readJsonBody(req);
  const title = String(body?.title ?? '').trim();
  if (!title) {
    sendJson(res, 400, { error: 'Название аудио обязательно.' });
    return true;
  }

  try {
    const fileBuffer = decodeBase64Audio(body?.contentBase64);
    const fileExtension = detectAudioExtension({
      mimeType: body?.mimeType,
      fileName: body?.fileName,
    });
    const storageDir = resolveAudioStorageDir(env);
    await mkdir(storageDir, { recursive: true });

    const storedFileName = `${Date.now()}-${sanitizeStoredBaseName(body?.fileName)}-${randomUUID()}${fileExtension}`;
    const storagePath = join(storageDir, storedFileName);
    await writeFile(storagePath, fileBuffer);

    const currentUser = context.currentUser;
    const publicUrl = `${resolvePublicBaseUrl(req, env)}${AUDIO_PUBLIC_PATH_PREFIX}${storedFileName}`;
    const track = await repo.createRadioTrack({
      title,
      authorName: currentUser?.profile?.displayName || currentUser?.login || 'Автор',
      durationSeconds: body?.durationSeconds,
      audioUrl: publicUrl,
    });

    sendJson(res, 201, {
      ok: true,
      track,
      storedFileName,
      audioUrl: publicUrl,
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'Не удалось загрузить аудио.',
    });
  }

  return true;
}

async function handleDiscussionImageUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env }) {
  if (pathname !== DISCUSSION_IMAGE_UPLOAD_ENDPOINT) {
    return false;
  }

  if (req.method !== 'POST') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const context = await buildContext({ req }, { repo, jwtSecret, adminUserIds });
  if (!context.currentUser) {
    sendJson(res, 401, { error: 'Authentication required' });
    return true;
  }

  const body = await readJsonBody(req);

  try {
    const fileBuffer = decodeBase64Image(body?.contentBase64);
    const fileExtension = detectImageExtension({
      mimeType: body?.mimeType,
      fileName: body?.fileName,
    });
    const storageDir = resolveDiscussionStorageDir(env);
    await mkdir(storageDir, { recursive: true });

    const storedFileName = `discussion-${Date.now()}-${sanitizeStoredBaseName(body?.fileName)}-${randomUUID()}${fileExtension}`;
    const storagePath = join(storageDir, storedFileName);
    await writeFile(storagePath, fileBuffer);

    const imageUrl = `${resolvePublicBaseUrl(req, env)}${DISCUSSION_PUBLIC_PATH_PREFIX}${storedFileName}`;
    sendJson(res, 201, {
      ok: true,
      storedFileName,
      imageUrl,
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'Не удалось загрузить изображение.',
    });
  }

  return true;
}

async function handleProfileImageUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env }) {

  console.log(pathname ,PROFILE_IMAGE_UPLOAD_ENDPOINT)
  if (pathname !== PROFILE_IMAGE_UPLOAD_ENDPOINT) {
    return false;
  }

  if (req.method !== 'POST') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const context = await buildContext({ req }, { repo, jwtSecret, adminUserIds });
  if (!context.currentUser) {
    sendJson(res, 401, { error: 'Authentication required' });
    return true;
  }

  const body = await readJsonBody(req);

  try {
    const kind = normalizeProfileImageKind(body?.kind);
    const fileBuffer = decodeBase64Image(body?.contentBase64);
    const fileExtension = detectImageExtension({
      mimeType: body?.mimeType,
      fileName: body?.fileName,
    });
    const storageDir = resolveProfileStorageDir(env);
    await mkdir(storageDir, { recursive: true });

    const storedFileName = `${kind}-${Date.now()}-${sanitizeStoredBaseName(body?.fileName)}-${randomUUID()}${fileExtension}`;
    const storagePath = join(storageDir, storedFileName);
    await writeFile(storagePath, fileBuffer);

    const imageUrl = `${resolvePublicBaseUrl(req, env)}${PROFILE_PUBLIC_PATH_PREFIX}${storedFileName}`;
    sendJson(res, 201, {
      ok: true,
      kind,
      storedFileName,
      imageUrl,
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'Не удалось загрузить изображение.',
    });
  }

  return true;
}

async function handleAudioFileRequest({ req, res, pathname, env }) {
  if (!pathname.startsWith(AUDIO_PUBLIC_PATH_PREFIX)) {
    return false;
  }

  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const requestedFileName = decodeURIComponent(pathname.slice(AUDIO_PUBLIC_PATH_PREFIX.length));
  if (!requestedFileName || requestedFileName.includes('/') || requestedFileName.includes('..')) {
    sendJson(res, 400, { error: 'Invalid file path' });
    return true;
  }

  const storagePath = join(resolveAudioStorageDir(env), requestedFileName);

  try {
    const fileStat = await stat(storagePath);
    res.statusCode = 200;
    res.setHeader('content-type', AUDIO_CONTENT_TYPE_BY_EXTENSION[extname(requestedFileName).toLowerCase()] || 'application/octet-stream');
    res.setHeader('content-length', String(fileStat.size));
    createReadStream(storagePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: 'Audio file not found' });
  }

  return true;
}

async function handleDiscussionImageFileRequest({ req, res, pathname, env }) {
  if (!pathname.startsWith(DISCUSSION_PUBLIC_PATH_PREFIX)) {
    return false;
  }

  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const requestedFileName = decodeURIComponent(pathname.slice(DISCUSSION_PUBLIC_PATH_PREFIX.length));
  if (!requestedFileName || requestedFileName.includes('/') || requestedFileName.includes('..')) {
    sendJson(res, 400, { error: 'Invalid file path' });
    return true;
  }

  const storagePath = join(resolveDiscussionStorageDir(env), requestedFileName);

  try {
    const fileStat = await stat(storagePath);
    res.statusCode = 200;
    res.setHeader('content-type', IMAGE_CONTENT_TYPE_BY_EXTENSION[extname(requestedFileName).toLowerCase()] || 'application/octet-stream');
    res.setHeader('content-length', String(fileStat.size));
    createReadStream(storagePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: 'Discussion image not found' });
  }

  return true;
}

async function handleProfileImageFileRequest({ req, res, pathname, env }) {
  if (!pathname.startsWith(PROFILE_PUBLIC_PATH_PREFIX)) {
    return false;
  }

  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return true;
  }

  const requestedFileName = decodeURIComponent(pathname.slice(PROFILE_PUBLIC_PATH_PREFIX.length));
  if (!requestedFileName || requestedFileName.includes('/') || requestedFileName.includes('..')) {
    sendJson(res, 400, { error: 'Invalid file path' });
    return true;
  }

  const storagePath = join(resolveProfileStorageDir(env), requestedFileName);

  try {
    const fileStat = await stat(storagePath);
    res.statusCode = 200;
    res.setHeader('content-type', IMAGE_CONTENT_TYPE_BY_EXTENSION[extname(requestedFileName).toLowerCase()] || 'application/octet-stream');
    res.setHeader('content-length', String(fileStat.size));
    createReadStream(storagePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: 'Profile image not found' });
  }

  return true;
}

export function createHttpServer({ apolloServer, repo, jwtSecret, adminUserIds = new Set(), env = process.env, fetchImpl = globalThis.fetch }) {
  apolloServer.assertStarted('createHttpServer');

  return createNodeHttpServer(async (req, res) => {
    try {
      setCorsHeaders(req, res);

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const { pathname, searchParams } = url;

      if (await handleSocialAuthRequest({ req, res, pathname, searchParams, repo, jwtSecret, env, fetchImpl })) {
        return;
      }

      if (await handleRadioUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env })) {
        return;
      }

      if (await handleProfileImageUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env })) {
        return;
      }

      if (await handleDiscussionImageUploadRequest({ req, res, pathname, repo, jwtSecret, adminUserIds, env })) {
        return;
      }

      if (await handleAudioFileRequest({ req, res, pathname, env })) {
        return;
      }

      if (await handleDiscussionImageFileRequest({ req, res, pathname, env })) {
        return;
      }

      if (await handleProfileImageFileRequest({ req, res, pathname, env })) {
        return;
      }

      if (pathname === '/api' || pathname === '/graphql') {
        await handleGraphqlRequest({ req, res, apolloServer, repo, jwtSecret, adminUserIds });
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      const statusCode = error instanceof SocialAuthError ? error.statusCode : 500;
      sendJson(res, statusCode, {
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
}
