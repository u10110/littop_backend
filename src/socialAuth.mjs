import { createHash, randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { hashPassword, issueToken } from './auth.mjs';

const SOCIAL_STATE_EXPIRES_IN = '10m';
const FRONTEND_CALLBACK_PATH = '/auth/callback';
const DEFAULT_REDIRECT_TARGET = '/personal';
const SUPPORTED_PROVIDERS = new Set(['vk', 'ok']);

export class SocialAuthError extends Error {
  constructor(message, { statusCode = 400, code = 'SOCIAL_AUTH_ERROR', expose = true } = {}) {
    super(message);
    this.name = 'SocialAuthError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getHeader(req, name) {
  const value = req?.headers?.[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function md5Hex(value) {
  return createHash('md5').update(String(value)).digest('hex');
}

function slugifyLoginCandidate(value) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || `user-${randomUUID().slice(0, 8)}`;
}

function normalizeMode(value) {
  return cleanText(value).toLowerCase() === 'register' ? 'register' : 'login';
}

function normalizeProvider(value) {
  const provider = cleanText(value).toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new SocialAuthError('Неподдерживаемый провайдер соцвхода.', {
      statusCode: 404,
      code: 'SOCIAL_PROVIDER_NOT_FOUND',
    });
  }
  return provider;
}

function providerLabel(provider) {
  return provider === 'vk' ? 'ВКонтакте' : 'Одноклассники';
}

function resolveRequestOrigin(req) {
  const forwardedProto = cleanText(getHeader(req, 'x-forwarded-proto')).split(',')[0];
  const forwardedHost = cleanText(getHeader(req, 'x-forwarded-host')).split(',')[0];
  const host = forwardedHost || cleanText(getHeader(req, 'host')) || 'localhost:4000';
  const proto = forwardedProto || (req?.socket?.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}

function resolvePublicBaseUrl(req, env = process.env) {
  const configured = cleanText(env.PUBLIC_BASE_URL || env.APP_BASE_URL || env.BACKEND_PUBLIC_URL);
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return resolveRequestOrigin(req);
}

function normalizeFrontendCallbackUrl(rawRedirectUri) {
  const redirectUri = cleanText(rawRedirectUri);
  if (!redirectUri) {
    throw new SocialAuthError('Не передан redirect_uri фронта.', {
      statusCode: 400,
      code: 'SOCIAL_REDIRECT_URI_MISSING',
    });
  }

  let url;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new SocialAuthError('Некорректный redirect_uri фронта.', {
      statusCode: 400,
      code: 'SOCIAL_REDIRECT_URI_INVALID',
    });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new SocialAuthError('redirect_uri фронта должен быть http/https URL.', {
      statusCode: 400,
      code: 'SOCIAL_REDIRECT_URI_INVALID_PROTOCOL',
    });
  }

  if (url.pathname !== FRONTEND_CALLBACK_PATH) {
    throw new SocialAuthError('redirect_uri фронта должен вести на /auth/callback.', {
      statusCode: 400,
      code: 'SOCIAL_REDIRECT_URI_PATH_INVALID',
    });
  }

  if (!cleanText(url.searchParams.get('redirect'))) {
    url.searchParams.set('redirect', DEFAULT_REDIRECT_TARGET);
  }

  return url;
}

function buildFrontendReturnUrl(frontendRedirectUri, params = {}) {
  const url = frontendRedirectUri instanceof URL
    ? new URL(frontendRedirectUri.toString())
    : normalizeFrontendCallbackUrl(frontendRedirectUri);

  url.searchParams.delete('token');
  url.searchParams.delete('error');

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function parseJsonResponse(rawText, fallbackMessage) {
  try {
    return JSON.parse(rawText);
  } catch {
    throw new SocialAuthError(fallbackMessage, {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_BAD_JSON',
      expose: false,
    });
  }
}

async function fetchJson(url, { method = 'GET', headers = {}, body, errorMessage, fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(url, { method, headers, body });
  const text = await response.text();
  const payload = text ? parseJsonResponse(text, errorMessage) : {};

  if (!response.ok) {
    const providerError = cleanText(payload?.error_description || payload?.error_msg || payload?.error || payload?.message);
    throw new SocialAuthError(providerError || errorMessage, {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_HTTP_ERROR',
      expose: false,
    });
  }

  return payload;
}

function buildVkAuthorizeUrl({ config, backendCallbackUrl, state }) {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', backendCallbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('v', config.apiVersion);
  return url.toString();
}

function buildOkAuthorizeUrl({ config, backendCallbackUrl, state }) {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', backendCallbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  return url.toString();
}

function createSocialAuthConfig(env = process.env) {
  return {
    vk: {
      provider: 'vk',
      clientId: cleanText(env.VK_CLIENT_ID),
      clientSecret: cleanText(env.VK_CLIENT_SECRET),
      authorizeUrl: cleanText(env.VK_AUTHORIZE_URL) || 'https://oauth.vk.com/authorize',
      tokenUrl: cleanText(env.VK_TOKEN_URL) || 'https://oauth.vk.com/access_token',
      userInfoUrl: cleanText(env.VK_USERINFO_URL) || 'https://api.vk.com/method/users.get',
      scope: cleanText(env.VK_SCOPE) || 'email',
      apiVersion: cleanText(env.VK_API_VERSION) || '5.199',
    },
    ok: {
      provider: 'ok',
      clientId: cleanText(env.OK_CLIENT_ID),
      clientSecret: cleanText(env.OK_CLIENT_SECRET),
      applicationKey: cleanText(env.OK_APPLICATION_KEY || env.OK_PUBLIC_KEY),
      authorizeUrl: cleanText(env.OK_AUTHORIZE_URL) || 'https://connect.ok.ru/oauth/authorize',
      tokenUrl: cleanText(env.OK_TOKEN_URL) || 'https://api.ok.ru/oauth/token.do',
      userInfoUrl: cleanText(env.OK_USERINFO_URL) || 'https://api.ok.ru/fb.do',
      scope: cleanText(env.OK_SCOPE) || 'VALUABLE_ACCESS',
    },
  };
}

function assertProviderConfigured(provider, config) {
  if (provider === 'vk') {
    if (!config.clientId || !config.clientSecret) {
      throw new SocialAuthError(`Соцвход через ${providerLabel(provider)} не настроен на backend.`, {
        statusCode: 503,
        code: 'SOCIAL_PROVIDER_NOT_CONFIGURED',
      });
    }
    return;
  }

  if (!config.clientId || !config.clientSecret || !config.applicationKey) {
    throw new SocialAuthError(`Соцвход через ${providerLabel(provider)} не настроен на backend.`, {
      statusCode: 503,
      code: 'SOCIAL_PROVIDER_NOT_CONFIGURED',
    });
  }
}

function issueStateToken(payload, secret) {
  return jwt.sign(
    {
      type: 'social-auth-state',
      ...payload,
    },
    secret,
    { expiresIn: SOCIAL_STATE_EXPIRES_IN },
  );
}

function decodeStateToken(token, secret) {
  if (!cleanText(token)) {
    throw new SocialAuthError('Отсутствует state для соцвхода.', {
      statusCode: 400,
      code: 'SOCIAL_STATE_MISSING',
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    throw new SocialAuthError('State соцвхода истёк или повреждён.', {
      statusCode: 400,
      code: 'SOCIAL_STATE_INVALID',
    });
  }

  if (payload?.type !== 'social-auth-state') {
    throw new SocialAuthError('State соцвхода имеет неверный формат.', {
      statusCode: 400,
      code: 'SOCIAL_STATE_INVALID',
    });
  }

  return {
    provider: normalizeProvider(payload.provider),
    mode: normalizeMode(payload.mode),
    frontendRedirectUri: normalizeFrontendCallbackUrl(payload.frontendRedirectUri),
    backendCallbackUrl: cleanText(payload.backendCallbackUrl),
  };
}

function normalizeVkIdentity(tokenPayload, profilePayload) {
  const profile = Array.isArray(profilePayload?.response) ? profilePayload.response[0] : null;
  if (!profile?.id) {
    throw new SocialAuthError('VK не вернул id пользователя.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_BAD_PROFILE',
      expose: false,
    });
  }

  const fullName = [cleanText(profile.first_name), cleanText(profile.last_name)].filter(Boolean).join(' ').trim();
  const displayName = fullName || cleanText(profile.screen_name) || `VK ${profile.id}`;
  const loginHint = cleanText(profile.screen_name) || slugifyLoginCandidate(displayName);
  const profileUrl = cleanText(profile.screen_name)
    ? `https://vk.com/${profile.screen_name}`
    : `https://vk.com/id${profile.id}`;

  return {
    provider: 'vk',
    providerUserId: String(profile.id),
    email: cleanText(tokenPayload?.email),
    displayName,
    loginHint,
    avatarUrl: cleanText(profile.photo_200 || profile.photo_max_orig || profile.photo_100),
    profileUrl,
  };
}

function normalizeOkIdentity(profilePayload) {
  const uid = cleanText(profilePayload?.uid || profilePayload?.id);
  if (!uid) {
    throw new SocialAuthError('OK не вернул id пользователя.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_BAD_PROFILE',
      expose: false,
    });
  }

  const displayName = cleanText(profilePayload?.name)
    || [cleanText(profilePayload?.first_name), cleanText(profilePayload?.last_name)].filter(Boolean).join(' ').trim()
    || `OK ${uid}`;

  return {
    provider: 'ok',
    providerUserId: uid,
    email: cleanText(profilePayload?.email),
    displayName,
    loginHint: cleanText(profilePayload?.login) || slugifyLoginCandidate(displayName),
    avatarUrl: cleanText(profilePayload?.pic_3 || profilePayload?.pic2x3 || profilePayload?.pic_2 || profilePayload?.pic_1),
    profileUrl: cleanText(profilePayload?.url_profile) || `https://ok.ru/profile/${uid}`,
  };
}

async function exchangeVkCode({ code, config, backendCallbackUrl, fetchImpl }) {
  const url = new URL(config.tokenUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('client_secret', config.clientSecret);
  url.searchParams.set('redirect_uri', backendCallbackUrl);
  url.searchParams.set('code', code);

  const tokenPayload = await fetchJson(url.toString(), {
    fetchImpl,
    errorMessage: 'VK не отдал access token.',
  });

  if (tokenPayload?.error) {
    throw new SocialAuthError(cleanText(tokenPayload.error_description) || 'VK вернул ошибку авторизации.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_TOKEN_ERROR',
      expose: false,
    });
  }

  const accessToken = cleanText(tokenPayload?.access_token);
  const providerUserId = cleanText(tokenPayload?.user_id);
  if (!accessToken || !providerUserId) {
    throw new SocialAuthError('VK вернул неполный ответ авторизации.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_TOKEN_INVALID',
      expose: false,
    });
  }

  const profileUrl = new URL(config.userInfoUrl);
  profileUrl.searchParams.set('user_ids', providerUserId);
  profileUrl.searchParams.set('fields', 'screen_name,photo_200,photo_max_orig');
  profileUrl.searchParams.set('access_token', accessToken);
  profileUrl.searchParams.set('v', config.apiVersion);

  const profilePayload = await fetchJson(profileUrl.toString(), {
    fetchImpl,
    errorMessage: 'VK не отдал профиль пользователя.',
  });

  if (profilePayload?.error) {
    throw new SocialAuthError(cleanText(profilePayload.error?.error_msg) || 'VK вернул ошибку профиля.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_PROFILE_ERROR',
      expose: false,
    });
  }

  return normalizeVkIdentity(tokenPayload, profilePayload);
}

async function exchangeOkCode({ code, config, backendCallbackUrl, fetchImpl }) {
  const tokenPayload = await fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: backendCallbackUrl,
    }).toString(),
    fetchImpl,
    errorMessage: 'OK не отдал access token.',
  });

  if (tokenPayload?.error) {
    throw new SocialAuthError(cleanText(tokenPayload.error_description) || 'OK вернул ошибку авторизации.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_TOKEN_ERROR',
      expose: false,
    });
  }

  const accessToken = cleanText(tokenPayload?.access_token);
  if (!accessToken) {
    throw new SocialAuthError('OK вернул неполный ответ авторизации.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_TOKEN_INVALID',
      expose: false,
    });
  }

  const sessionSecret = md5Hex(`${accessToken}${config.clientSecret}`);
  const method = 'users.getCurrentUser';
  const sigSource = `application_key=${config.applicationKey}method=${method}${sessionSecret}`;
  const sig = md5Hex(sigSource);

  const profileUrl = new URL(config.userInfoUrl);
  profileUrl.searchParams.set('application_key', config.applicationKey);
  profileUrl.searchParams.set('method', method);
  profileUrl.searchParams.set('access_token', accessToken);
  profileUrl.searchParams.set('sig', sig);
  profileUrl.searchParams.set('format', 'json');

  const profilePayload = await fetchJson(profileUrl.toString(), {
    fetchImpl,
    errorMessage: 'OK не отдал профиль пользователя.',
  });

  if (profilePayload?.error_code || profilePayload?.error_msg) {
    throw new SocialAuthError(cleanText(profilePayload.error_msg) || 'OK вернул ошибку профиля.', {
      statusCode: 502,
      code: 'SOCIAL_PROVIDER_PROFILE_ERROR',
      expose: false,
    });
  }

  return normalizeOkIdentity(profilePayload);
}

async function exchangeCodeForIdentity({ provider, code, config, backendCallbackUrl, fetchImpl }) {
  if (provider === 'vk') {
    return exchangeVkCode({ code, config, backendCallbackUrl, fetchImpl });
  }
  return exchangeOkCode({ code, config, backendCallbackUrl, fetchImpl });
}

async function resolveUserFromIdentity({ identity, repo }) {
  const linkedUser = await repo.getUserBySocialAccount({
    provider: identity.provider,
    providerUserId: identity.providerUserId,
  });
  if (linkedUser) {
    await repo.linkSocialAccount({
      userId: linkedUser.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.email,
      providerLogin: identity.loginHint,
      avatarUrl: identity.avatarUrl,
      profileUrl: identity.profileUrl,
    });
    return linkedUser;
  }

  if (identity.email) {
    const existingByEmail = await repo.findUserByEmail(identity.email);
    if (existingByEmail) {
      await repo.linkSocialAccount({
        userId: existingByEmail.id,
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        providerEmail: identity.email,
        providerLogin: identity.loginHint,
        avatarUrl: identity.avatarUrl,
        profileUrl: identity.profileUrl,
      });
      return await repo.getUserById(existingByEmail.id);
    }
  }

  return repo.createUserFromSocialAuth({
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    email: identity.email,
    displayName: identity.displayName,
    loginHint: identity.loginHint,
    avatarUrl: identity.avatarUrl,
    profileUrl: identity.profileUrl,
    passwordHash: await hashPassword(randomUUID()),
  });
}

function socialErrorMessage(error, provider) {
  if (error instanceof SocialAuthError && error.expose && cleanText(error.message)) {
    return error.message;
  }
  return `Не удалось завершить вход через ${providerLabel(provider)}.`;
}

export function buildSocialAuthFailureRedirect({ provider, mode = 'login', redirectUri, error }) {
  const frontendRedirectUri = normalizeFrontendCallbackUrl(redirectUri);
  return buildFrontendReturnUrl(frontendRedirectUri, {
    provider,
    mode: normalizeMode(mode),
    error,
  });
}

export function buildSocialAuthStartRedirect({ provider, mode = 'login', redirectUri, req, jwtSecret, env = process.env }) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedMode = normalizeMode(mode);
  const frontendRedirectUri = normalizeFrontendCallbackUrl(redirectUri);
  const config = createSocialAuthConfig(env)[normalizedProvider];
  assertProviderConfigured(normalizedProvider, config);

  const backendCallbackUrl = new URL(`/auth/social/${normalizedProvider}/callback`, `${resolvePublicBaseUrl(req, env)}/`).toString();
  const state = issueStateToken({
    provider: normalizedProvider,
    mode: normalizedMode,
    frontendRedirectUri: frontendRedirectUri.toString(),
    backendCallbackUrl,
  }, jwtSecret);

  if (normalizedProvider === 'vk') {
    return buildVkAuthorizeUrl({ config, backendCallbackUrl, state });
  }

  return buildOkAuthorizeUrl({ config, backendCallbackUrl, state });
}

export async function completeSocialAuthCallback({ provider, stateToken, code, providerError = '', repo, jwtSecret, req, env = process.env, fetchImpl = globalThis.fetch }) {
  const state = decodeStateToken(stateToken, jwtSecret);
  if (state.provider !== normalizeProvider(provider)) {
    throw new SocialAuthError('Провайдер callback не совпадает со state.', {
      statusCode: 400,
      code: 'SOCIAL_PROVIDER_MISMATCH',
    });
  }

  try {
    if (providerError) {
      throw new SocialAuthError(providerError, {
        statusCode: 400,
        code: 'SOCIAL_PROVIDER_CALLBACK_ERROR',
      });
    }

    const normalizedCode = cleanText(code);
    if (!normalizedCode) {
      throw new SocialAuthError('Провайдер не вернул код авторизации.', {
        statusCode: 400,
        code: 'SOCIAL_CODE_MISSING',
      });
    }

    const config = createSocialAuthConfig(env)[state.provider];
    assertProviderConfigured(state.provider, config);

    const backendCallbackUrl = state.backendCallbackUrl || new URL(`/auth/social/${state.provider}/callback`, `${resolvePublicBaseUrl(req, env)}/`).toString();
    const identity = await exchangeCodeForIdentity({
      provider: state.provider,
      code: normalizedCode,
      config,
      backendCallbackUrl,
      fetchImpl,
    });
    const user = await resolveUserFromIdentity({ identity, repo });
    const token = issueToken(user, jwtSecret);

    return buildFrontendReturnUrl(state.frontendRedirectUri, {
      provider: state.provider,
      mode: state.mode,
      token,
    });
  } catch (error) {
    return buildFrontendReturnUrl(state.frontendRedirectUri, {
      provider: state.provider,
      mode: state.mode,
      error: socialErrorMessage(error, state.provider),
    });
  }
}

export function extractSocialCallbackParams(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  return {
    code: cleanText(params.get('code')),
    stateToken: cleanText(params.get('state')),
    providerError: cleanText(params.get('error_description') || params.get('error_reason') || params.get('error')),
  };
}

export function isSupportedSocialProvider(provider) {
  try {
    normalizeProvider(provider);
    return true;
  } catch {
    return false;
  }
}
