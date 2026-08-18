import nodemailer from 'nodemailer';

function asBoolean(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

export function createMailer(env = process.env) {
  const host = String(env.SMTP_HOST ?? '').trim();
  const from = String(env.SMTP_FROM_EMAIL ?? '').trim();
  if (!host || !from) return null;

  const port = Number(env.SMTP_PORT || 587);
  const user = String(env.SMTP_USER ?? '').trim();
  const password = String(env.SMTP_PASSWORD ?? '');
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: asBoolean(env.SMTP_SECURE),
    auth: user ? { user, pass: password } : undefined,
  });

  return {
    async sendPasswordReset({ email, resetUrl }) {
      await transport.sendMail({
        from,
        to: email,
        subject: 'Восстановление пароля — Литтоп',
        text: `Чтобы установить новый пароль, откройте ссылку: ${resetUrl}\n\nСсылка действует 1 час. Если вы не запрашивали восстановление, проигнорируйте это письмо.`,
        html: `<p>Чтобы установить новый пароль, откройте ссылку:</p><p><a href="${resetUrl}">Восстановить пароль</a></p><p>Ссылка действует 1 час. Если вы не запрашивали восстановление, проигнорируйте это письмо.</p>`,
      });
    },
  };
}
