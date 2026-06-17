import test from 'node:test';
import assert from 'node:assert/strict';

import { createApolloServer } from '../src/createServer.mjs';
import { decodeToken } from '../src/auth.mjs';
import { createHttpServer } from '../src/httpServer.mjs';

function makeFakeRepo() {
  let nextUserId = 1;
  const users = [];
  const socialAccounts = [];

  return {
    async ping() {
      return true;
    },
    async getUserById(id) {
      return users.find((user) => String(user.id) === String(id)) ?? null;
    },
    async getUserBySocialAccount({ provider, providerUserId }) {
      const account = socialAccounts.find((item) => item.provider === provider && item.providerUserId === providerUserId);
      if (!account) return null;
      return users.find((user) => String(user.id) === String(account.userId)) ?? null;
    },
    async findUserByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async linkSocialAccount({ userId, provider, providerUserId, providerEmail = null, providerLogin = null, avatarUrl = null, profileUrl = null }) {
      const existing = socialAccounts.find((item) => item.provider === provider && item.providerUserId === providerUserId);
      if (existing) {
        Object.assign(existing, { userId, providerEmail, providerLogin, avatarUrl, profileUrl });
        return existing;
      }
      const row = { userId, provider, providerUserId, providerEmail, providerLogin, avatarUrl, profileUrl };
      socialAccounts.push(row);
      return row;
    },
    async createUserFromSocialAuth({ provider, providerUserId, email, displayName, loginHint, avatarUrl = null, profileUrl = null }) {
      const user = {
        id: nextUserId++,
        email,
        login: loginHint,
        role: 'author',
        status: 'active',
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          displayName,
          bio: null,
          city: null,
          websiteUrl: null,
          ratingTotal: 0,
          worksCountCached: 0,
          isClassic: false,
          isFeatured: false,
          avatarUrl,
          profileUrl,
        },
      };
      users.push(user);
      socialAccounts.push({
        userId: user.id,
        provider,
        providerUserId,
        providerEmail: email,
        providerLogin: loginHint,
        avatarUrl,
        profileUrl,
      });
      return user;
    },
  };
}

function createFetchMock() {
  return async (url, options = {}) => {
    const target = typeof url === 'string' ? new URL(url) : new URL(url.toString());

    if (target.hostname === 'oauth.vk.com' && target.pathname === '/access_token') {
      return new Response(JSON.stringify({
        access_token: 'vk-access-token',
        user_id: '501',
        email: 'vk-user@example.com',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (target.hostname === 'api.vk.com' && target.pathname === '/method/users.get') {
      return new Response(JSON.stringify({
        response: [{
          id: 501,
          first_name: 'Виктор',
          last_name: 'Петров',
          screen_name: 'victorpetrov',
          photo_200: 'https://cdn.example.com/vk-avatar.jpg',
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (target.hostname === 'api.ok.ru' && target.pathname === '/oauth/token.do') {
      assert.equal(options.method, 'POST');
      return new Response(JSON.stringify({
        access_token: 'ok-access-token',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (target.hostname === 'api.ok.ru' && target.pathname === '/fb.do') {
      assert.equal(target.searchParams.get('method'), 'users.getCurrentUser');
      assert.ok(target.searchParams.get('sig'));
      return new Response(JSON.stringify({
        uid: '777',
        first_name: 'Олег',
        last_name: 'Смирнов',
        name: 'Олег Смирнов',
        email: 'ok-user@example.com',
        pic_3: 'https://cdn.example.com/ok-avatar.jpg',
        url_profile: 'https://ok.ru/profile/777',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${target}`);
  };
}

async function startTestServer() {
  const repo = makeFakeRepo();
  const apolloServer = createApolloServer({ repo, jwtSecret: 'test-secret' });
  await apolloServer.start();

  const nodeServer = createHttpServer({
    apolloServer,
    repo,
    jwtSecret: 'test-secret',
    env: {
      PUBLIC_BASE_URL: 'http://127.0.0.1',
      VK_CLIENT_ID: 'vk-client',
      VK_CLIENT_SECRET: 'vk-secret',
      OK_CLIENT_ID: 'ok-client',
      OK_CLIENT_SECRET: 'ok-secret',
      OK_APPLICATION_KEY: 'ok-public',
    },
    fetchImpl: createFetchMock(),
  });

  await new Promise((resolve) => nodeServer.listen(0, '127.0.0.1', resolve));
  const address = nodeServer.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    repo,
    apolloServer,
    nodeServer,
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => nodeServer.close((error) => (error ? reject(error) : resolve())));
      await apolloServer.stop();
    },
  };
}

test('VK social auth routes create a user and redirect back with project JWT', async () => {
  const app = await startTestServer();
  try {
    const frontendCallback = 'http://frontend.local/auth/callback?provider=vk&mode=login&redirect=%2Fpersonal';
    const startResponse = await fetch(`${app.baseUrl}/auth/social/vk/start?mode=login&redirect_uri=${encodeURIComponent(frontendCallback)}`, {
      redirect: 'manual',
    });

    assert.equal(startResponse.status, 302);
    const providerLocation = startResponse.headers.get('location');
    assert.ok(providerLocation);

    const providerUrl = new URL(providerLocation);
    assert.equal(providerUrl.origin, 'https://oauth.vk.com');
    assert.equal(providerUrl.pathname, '/authorize');
    assert.equal(providerUrl.searchParams.get('client_id'), 'vk-client');
    assert.equal(providerUrl.searchParams.get('response_type'), 'code');
    const state = providerUrl.searchParams.get('state');
    assert.ok(state);

    const callbackResponse = await fetch(`${app.baseUrl}/auth/social/vk/callback?code=test-code&state=${encodeURIComponent(state)}`, {
      redirect: 'manual',
    });
    assert.equal(callbackResponse.status, 302);

    const frontendLocation = callbackResponse.headers.get('location');
    assert.ok(frontendLocation);
    const frontendUrl = new URL(frontendLocation);
    assert.equal(frontendUrl.origin, 'http://frontend.local');
    assert.equal(frontendUrl.pathname, '/auth/callback');
    assert.equal(frontendUrl.searchParams.get('provider'), 'vk');
    assert.equal(frontendUrl.searchParams.get('redirect'), '/personal');
    assert.ok(frontendUrl.searchParams.get('token'));

    const payload = decodeToken(frontendUrl.searchParams.get('token'), 'test-secret');
    assert.equal(payload.login, 'victorpetrov');

    const user = await app.repo.findUserByEmail('vk-user@example.com');
    assert.ok(user);
    assert.equal(user.profile.displayName, 'Виктор Петров');
  } finally {
    await app.close();
  }
});

test('OK social auth callback links an existing user by email and returns project JWT', async () => {
  const app = await startTestServer();
  try {
    const existingUser = await app.repo.createUserFromSocialAuth({
      provider: 'vk',
      providerUserId: 'seed-1',
      email: 'ok-user@example.com',
      displayName: 'Уже зарегистрирован',
      loginHint: 'existing-user',
    });

    const frontendCallback = 'http://frontend.local/auth/callback?provider=ok&mode=register&redirect=%2Fpersonal';
    const startResponse = await fetch(`${app.baseUrl}/auth/social/ok/start?mode=register&redirect_uri=${encodeURIComponent(frontendCallback)}`, {
      redirect: 'manual',
    });
    const providerUrl = new URL(startResponse.headers.get('location'));
    const state = providerUrl.searchParams.get('state');
    assert.ok(state);

    const callbackResponse = await fetch(`${app.baseUrl}/auth/social/ok/callback?code=test-code&state=${encodeURIComponent(state)}`, {
      redirect: 'manual',
    });
    assert.equal(callbackResponse.status, 302);

    const frontendUrl = new URL(callbackResponse.headers.get('location'));
    const token = frontendUrl.searchParams.get('token');
    assert.ok(token);

    const payload = decodeToken(token, 'test-secret');
    assert.equal(String(payload.sub), String(existingUser.id));
    assert.equal(payload.login, 'existing-user');

    const linked = await app.repo.getUserBySocialAccount({ provider: 'ok', providerUserId: '777' });
    assert.ok(linked);
    assert.equal(String(linked.id), String(existingUser.id));
  } finally {
    await app.close();
  }
});
