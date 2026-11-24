import assert from 'node:assert/strict';
import test from 'node:test';
import { DEV_ACCESS_TOKEN, DevSessionError, getDevLogin } from '../src/api/devAccount.ts';
import { getFormsError } from '../src/api/formsClient.ts';

test('test login is available only in development with the explicit credentials', () => {
  const credentials = { email: 'admin@example.com', password: 'password123' };
  assert.equal(getDevLogin(credentials, true)?.accessToken, DEV_ACCESS_TOKEN);
  assert.equal(getDevLogin(credentials, true)?.user.email, credentials.email);
  assert.equal(getDevLogin(credentials, false), null);
  assert.equal(getDevLogin({ ...credentials, password: 'wrong' }, true), null);
  assert.equal(getDevLogin({ ...credentials, email: 'another@example.com' }, true), null);
});

test('test account shows the account requirement instead of a connection failure', () => {
  assert.equal(getFormsError(new DevSessionError()), 'Для работы с формами на сервере войдите в настоящий аккаунт.');
});
