import { createServer as createNodeHttpServer } from 'node:http';
import { parse as parseUrl } from 'node:url';

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

async function handleGraphqlRequest({ req, res, apolloServer, repo, jwtSecret }) {
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
    context: () => buildContext({ req }, { repo, jwtSecret }),
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

export function createHttpServer({ apolloServer, repo, jwtSecret, env = process.env, fetchImpl = globalThis.fetch }) {
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

      if (pathname === '/' || pathname === '/graphql') {
        await handleGraphqlRequest({ req, res, apolloServer, repo, jwtSecret });
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
