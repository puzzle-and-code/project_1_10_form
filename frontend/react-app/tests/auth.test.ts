import assert from 'node:assert/strict';
import test from 'node:test';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { httpClient, refreshAccessToken, refreshClient, registerAuthFailureHandler } from '../src/api/httpClient.ts';
import { logoutRequest } from '../src/api/auth.ts';
import { tokenStore } from '../src/api/tokenStore.ts';

function response(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  return { config, status, statusText: '', data, headers: {} };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError('Unauthorized', undefined, config, undefined, response(config, 401));
}

test('startup and concurrent 401 responses share refresh, including a late 401', async () => {
  tokenStore.set('expired');
  let refreshes = 0;
  let finishRefresh!: () => void;
  let releaseLate401!: () => void;
  let startedLateRequest!: () => void;
  const refreshGate = new Promise<void>(resolve => { finishRefresh = resolve; });
  const lateGate = new Promise<void>(resolve => { releaseLate401 = resolve; });
  const lateStarted = new Promise<void>(resolve => { startedLateRequest = resolve; });
  refreshClient.defaults.adapter = async config => {
    refreshes++;
    await refreshGate;
    return response(config, 200, { accessToken: 'renewed' });
  };
  httpClient.defaults.adapter = async config => {
    if (config.headers.get('Authorization') !== 'Bearer renewed') {
      if (config.url === '/late') {
        startedLateRequest();
        await lateGate;
      }
      throw unauthorized(config);
    }
    return response(config, 200);
  };

  const startup = refreshAccessToken();
  const first = httpClient.get('/forms');
  const second = httpClient.get('/questions');
  const late = httpClient.get('/late');
  await lateStarted;
  finishRefresh();
  await Promise.all([startup, first, second]);
  releaseLate401();
  await late;
  assert.equal(refreshes, 1);
});

test('retry stops after one attempt and only a rejected refresh cookie ends the session', async () => {
  tokenStore.set('expired');
  let attempts = 0;
  let refreshes = 0;
  let failures = 0;
  const unsubscribe = registerAuthFailureHandler(() => { failures++; });
  try {
    httpClient.defaults.adapter = async config => {
      attempts++;
      throw unauthorized(config);
    };
    refreshClient.defaults.adapter = async config => {
      refreshes++;
      return response(config, 200, { accessToken: 'renewed' });
    };

    await assert.rejects(httpClient.get('/forms'), /Unauthorized/);
    assert.equal(attempts, 2);
    assert.equal(refreshes, 1);
    assert.equal(failures, 0);

    refreshClient.defaults.adapter = async () => { throw new Error('Offline'); };
    await assert.rejects(httpClient.get('/forms'), /Offline/);
    assert.equal(tokenStore.get(), 'renewed');
    assert.equal(failures, 0);

    refreshClient.defaults.adapter = async config => { throw unauthorized(config); };
    await assert.rejects(httpClient.get('/forms'), /Unauthorized/);
    assert.equal(tokenStore.get(), null);
    assert.equal(failures, 1);
  } finally {
    unsubscribe();
  }
});

test('logout waits for cookie rotation and never restores the old session', async () => {
  tokenStore.set('old');
  let finishRefresh!: () => void;
  const gate = new Promise<void>(resolve => { finishRefresh = resolve; });
  const calls: (string | undefined)[] = [];
  refreshClient.defaults.adapter = async config => {
    calls.push(config.url);
    if (config.url === '/auth/refresh') {
      await gate;
      return response(config, 200, { accessToken: 'renewed' });
    }
    return response(config, 200);
  };

  const refresh = assert.rejects(refreshAccessToken(), /Сессия изменилась/);
  const logout = logoutRequest();
  finishRefresh();
  await Promise.all([refresh, logout]);
  assert.deepEqual(calls, ['/auth/refresh', '/auth/logout']);
  assert.equal(tokenStore.get(), null);
});
