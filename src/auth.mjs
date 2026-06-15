import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '30d';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function issueToken(user, secret, expiresIn = DEFAULT_EXPIRES_IN) {
  return jwt.sign(
    {
      sub: String(user.id),
      login: user.login,
      role: user.role ?? 'author',
    },
    secret,
    { expiresIn },
  );
}

export function decodeToken(token, secret) {
  return jwt.verify(token, secret);
}

export function getBearerToken(headerValue) {
  if (!headerValue) return '';
  const [scheme, token] = String(headerValue).split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token.trim();
}

export async function getCurrentUserFromHeader(headerValue, secret, repo) {
  const token = getBearerToken(headerValue);
  if (!token) return null;
  try {
    const payload = decodeToken(token, secret);
    if (!payload?.sub) return null;
    return await repo.getUserById(payload.sub);
  } catch {
    return null;
  }
}
