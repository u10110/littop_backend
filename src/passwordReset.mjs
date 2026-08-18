import { createHash, randomBytes } from 'node:crypto';

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createPasswordResetToken() {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token) {
  return createHash('sha256').update(String(token ?? ''), 'utf8').digest('hex');
}

export function buildPasswordResetUrl(frontendBaseUrl, token) {
  const url = new URL('/', frontendBaseUrl);
  url.searchParams.set('auth', 'reset');
  url.searchParams.set('token', token);
  return url.toString();
}
