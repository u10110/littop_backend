import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword, issueToken, decodeToken } from '../src/auth.mjs';

test('hashPassword/verifyPassword and JWT helpers work', async () => {
  const hash = await hashPassword('s3cret-pass');
  assert.notEqual(hash, 's3cret-pass');
  assert.equal(await verifyPassword('s3cret-pass', hash), true);
  assert.equal(await verifyPassword('wrong-pass', hash), false);

  const token = issueToken({ id: 7, login: 'neo' }, 'test-secret');
  const payload = decodeToken(token, 'test-secret');
  assert.equal(payload.sub, '7');
  assert.equal(payload.login, 'neo');
});
