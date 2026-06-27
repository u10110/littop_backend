import { randomUUID, createHash } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';

import jwt from 'jsonwebtoken';

export const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_RESET_EXPIRES_IN = '1h';

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value ?? ''), 'utf8').toString('base64')}?=`;
}

function normalizeLineEndings(value) {
  return String(value ?? '').replace(/\r?\n/g, '\r\n');
}

function dotStuff(value) {
  return normalizeLineEndings(value)
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

function buildEnvelopeAddress(value) {
  const normalized = cleanText(value);
  if (!normalized) {
    throw new Error('Email address is required.');
  }
  return normalized;
}

function parseBoolean(value, fallback = false) {
  const normalized = cleanText(value).toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function createSmtpResponseQueue(socket) {
  let buffer = '';
  let currentLines = [];
  const pending = [];

  function rejectPending(error) {
    while (pending.length) {
      pending.shift().reject(error);
    }
  }

  socket.on('data', (chunk) => {
    buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);

    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      currentLines.push(line);
      if (/^\d{3} /.test(line)) {
        const response = {
          code: Number(line.slice(0, 3)),
          text: currentLines.join('\n'),
        };
        currentLines = [];
        const waiter = pending.shift();
        if (waiter) {
          waiter.resolve(response);
        }
      }
    }
  });

  socket.on('error', rejectPending);
  socket.on('close', () => rejectPending(new Error('SMTP connection closed unexpectedly.')));

  return {
    read() {
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      });
    },
  };
}

function openSocket({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.createConnection({ host, port });

    const onError = (error) => {
      socket.removeListener('connect', onConnect);
      socket.removeListener('secureConnect', onSecureConnect);
      reject(error);
    };
    const onConnect = () => {
      socket.removeListener('error', onError);
      resolve(socket);
    };
    const onSecureConnect = () => {
      socket.removeListener('error', onError);
      resolve(socket);
    };

    socket.once('error', onError);
    socket.once(secure ? 'secureConnect' : 'connect', secure ? onSecureConnect : onConnect);
  });
}

async function sendSmtpMail({ host, port, secure, user, password, fromEmail, to, subject, text }) {
  let socket = await openSocket({ host, port, secure });
  let queue = createSmtpResponseQueue(socket);

  async function readResponse(expectedCodes) {
    const response = await queue.read();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP error ${response.code}: ${response.text}`);
    }
    return response;
  }

  async function writeCommand(command, expectedCodes) {
    socket.write(`${command}\r\n`);
    return readResponse(expectedCodes);
  }

  async function upgradeToTls() {
    const secureSocket = await new Promise((resolve, reject) => {
      const nextSocket = tls.connect({
        socket,
        servername: host,
      }, () => resolve(nextSocket));
      nextSocket.once('error', reject);
    });
    socket = secureSocket;
    queue = createSmtpResponseQueue(socket);
  }

  const localHostName = 'littop.local';
  await readResponse([220]);
  const ehloResponse = await writeCommand(`EHLO ${localHostName}`, [250]);

  if (!secure && /STARTTLS/im.test(ehloResponse.text)) {
    await writeCommand('STARTTLS', [220]);
    await upgradeToTls();
    await writeCommand(`EHLO ${localHostName}`, [250]);
  }

  await writeCommand('AUTH LOGIN', [334]);
  await writeCommand(Buffer.from(user, 'utf8').toString('base64'), [334]);
  await writeCommand(Buffer.from(password, 'utf8').toString('base64'), [235]);
  await writeCommand(`MAIL FROM:<${buildEnvelopeAddress(fromEmail)}>`, [250]);
  await writeCommand(`RCPT TO:<${buildEnvelopeAddress(to)}>`, [250, 251]);
  await writeCommand('DATA', [354]);

  const message = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${host}>`,
    '',
    dotStuff(text),
  ].join('\r\n');

  socket.write(`${message}\r\n.\r\n`);
  await readResponse([250]);
  await writeCommand('QUIT', [221]);
  socket.end();
}

export function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export function validatePassword(value) {
  const password = String(value ?? '');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов.`;
  }
  return '';
}

function passwordFingerprint(passwordHash) {
  return createHash('sha256').update(String(passwordHash ?? ''), 'utf8').digest('hex').slice(0, 16);
}

export function buildPasswordResetToken(user, secret, expiresIn = PASSWORD_RESET_EXPIRES_IN) {
  return jwt.sign(
    {
      type: 'password-reset',
      sub: String(user.id),
      email: normalizeEmail(user.email),
      fingerprint: passwordFingerprint(user.passwordHash),
    },
    secret,
    { expiresIn },
  );
}

export function verifyPasswordResetToken(token, secret) {
  const payload = jwt.verify(token, secret);
  if (payload?.type !== 'password-reset' || !payload?.sub || !payload?.email || !payload?.fingerprint) {
    throw new Error('Invalid password reset token.');
  }
  return payload;
}

export function matchesPasswordResetToken(user, payload) {
  return Boolean(
    user?.id
    && normalizeEmail(user.email) === normalizeEmail(payload?.email)
    && passwordFingerprint(user.passwordHash) === String(payload?.fingerprint || ''),
  );
}

export function buildPasswordResetUrl(frontendBaseUrl, token) {
  const base = cleanText(frontendBaseUrl) || 'http://localhost:5173';
  const url = new URL(base);
  url.searchParams.set('auth', 'reset');
  url.searchParams.set('token', token);
  return url.toString();
}

export function createMailer(env = process.env) {
  const host = cleanText(env.SMTP_HOST);
  const user = cleanText(env.SMTP_USER);
  const password = cleanText(env.SMTP_PASSWORD);
  const secure = parseBoolean(env.SMTP_SECURE, true);
  const port = Number(env.SMTP_PORT || (secure ? 465 : 587));
  const fromEmail = cleanText(env.SMTP_FROM_EMAIL) || user;
  const enabled = Boolean(host && port && user && password && fromEmail);

  async function ensureConfigured() {
    if (!enabled) {
      throw new Error('Почтовая отправка не настроена на сервере.');
    }
  }

  async function sendMessage({ to, subject, text }) {
    await ensureConfigured();
    await sendSmtpMail({
      host,
      port,
      secure,
      user,
      password,
      fromEmail,
      to,
      subject,
      text,
    });
  }

  return {
    enabled,
    fromEmail,
    async sendWelcomeEmail({ to, displayName, appUrl = '' }) {
      const normalizedDisplayName = cleanText(displayName) || 'Автор';
      const normalizedAppUrl = cleanText(appUrl);
      const text = [
        `Здравствуйте, ${normalizedDisplayName}!`,
        '',
        'Ваш профиль на Littop успешно создан.',
        normalizedAppUrl ? `Открыть сайт: ${normalizedAppUrl}` : '',
        '',
        'Если это были не вы, просто проигнорируйте это письмо.',
      ].filter(Boolean).join('\n');

      await sendMessage({
        to,
        subject: 'Littop — регистрация завершена',
        text,
      });
    },
    async sendPasswordResetEmail({ to, displayName, resetUrl }) {
      const normalizedDisplayName = cleanText(displayName) || 'Автор';
      const text = [
        `Здравствуйте, ${normalizedDisplayName}!`,
        '',
        'Мы получили запрос на восстановление пароля для вашего профиля Littop.',
        `Чтобы задать новый пароль, откройте ссылку: ${resetUrl}`,
        '',
        'Ссылка действует 1 час.',
        'Если это были не вы, просто проигнорируйте это письмо.',
      ].join('\n');

      await sendMessage({
        to,
        subject: 'Littop — восстановление пароля',
        text,
      });
    },
  };
}
