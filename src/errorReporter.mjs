import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function defaultErrorLogPath() {
  return join(process.cwd(), 'logs', 'errors.jsonl');
}

function safeString(value, limit = 4000) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, limit);
}

function safePath(value) {
  try {
    const url = new URL(String(value || ''), 'http://backend.local');
    return `${url.pathname}${url.search ? '?[query]' : ''}`;
  } catch {
    return '[invalid-path]';
  }
}

export async function reportBackendError({ env = process.env, error, kind = 'http', req, statusCode, operationName } = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    environment: safeString(env.NODE_ENV || 'preprod', 80),
    kind: safeString(kind, 80),
    statusCode: Number.isFinite(Number(statusCode)) ? Number(statusCode) : undefined,
    operationName: safeString(operationName, 200) || undefined,
    method: safeString(req?.method, 16) || undefined,
    path: req?.url ? safePath(req.url) : undefined,
    error: safeString(error instanceof Error ? error.message : error, 2000),
    stack: error instanceof Error ? safeString(error.stack, 8000) : undefined,
  };

  for (const key of Object.keys(entry)) {
    if (entry[key] === undefined || entry[key] === '') delete entry[key];
  }

  const logPath = String(env.ERROR_LOG_PATH || defaultErrorLogPath());
  try {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch (loggingError) {
    // Error reporting must never take the backend down.
    console.error('Could not write backend error report:', loggingError?.message || loggingError);
  }
}
