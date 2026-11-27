import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { createFormsClient } from '../src/api/formsClient.ts';
import { FormsError, mergeCreatedForms, parseForms, parseCreatedForm } from '../src/api/formsData.ts';

const payload = { title: '  Опрос курса  ', description: '  Ваше мнение  ' };
const uuid = '12345678-1234-4234-8234-123456789abc';

test('real API creates by JWT ownership and uses returned UUID for the detail route', async () => {
  const calls: { method?: string; url?: string; body: unknown; params: unknown }[] = [];
  const form = { id: uuid, title: 'Опрос курса', description: '', status: 'draft', createdAt: '2026-11-18T10:00:00Z', questions: [] };
  const http = axios.create({ adapter: async config => {
    calls.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data), params: config.params });
    const data = config.url === '/forms/draft' ? { formId: uuid } : config.url === '/forms' ? [form] : form;
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createFormsClient(http);
  const created = await client.createForm(payload);
  assert.equal(created.id, uuid);
  const details = await client.getFormById(created.id);
  assert.equal(details.questionsCount, 0);
  assert.equal(details.updatedAt, null);
  await client.patchForm(created.id, { title: 'Другое название' });
  await client.getForms();
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['post', '/forms/draft'], ['get', `/forms/${uuid}`], ['patch', `/forms/${uuid}`], ['get', '/forms'],
  ]);
  assert.equal(calls[0].params, undefined);
  assert.deepEqual(calls[0].body, { title: 'Опрос курса', description: 'Ваше мнение' });
});

test('API failures never produce forms or successful publication', async () => {
  for (const status of [401, 403, 404, 500, undefined]) {
    const http = axios.create({ adapter: async config => {
      const response = status ? { status, statusText: 'error', data: {}, headers: {}, config } : undefined;
      throw new AxiosError('Failed', 'ERR_NETWORK', config, undefined, response);
    } });
    const client = createFormsClient(http);
    await assert.rejects(client.getForms(), error => error instanceof FormsError && error.status === status);
    await assert.rejects(client.getFormById('1'), FormsError);
    await assert.rejects(client.publishForm('1'), FormsError);
  }
});

test('new drafts remain visible while the server list is stale and merge without duplicates', () => {
  const created = parseCreatedForm({ formId: uuid }, payload);
  assert.equal(mergeCreatedForms([], [created])[0].id, uuid);
  const server = parseForms([{ ...created, title: 'Обновлённая', status: 'Published' }]);
  const merged = mergeCreatedForms(server, [created]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'published');
  assert.equal(merged[0].title, 'Обновлённая');
  assert.throws(() => parseForms([{ ...created, updatedAt: 'invalid' }]), FormsError);
  assert.throws(() => parseForms([created, created]), FormsError);
});

test('choice questions use backend option objects and normalize the returned type', async () => {
  const http = axios.create({ adapter: async config => {
    assert.equal(config.method, 'post');
    assert.equal(config.url, `/forms/${uuid}/questions`);
    assert.deepEqual(JSON.parse(config.data), {
      text: 'Выберите варианты', type: 'multi_choice', isRequired: true,
      options: [{ text: 'Первый' }, { text: 'Второй' }],
    });
    return { data: {
      id: 'q1', text: 'Выберите варианты', type: 'multi_choice', isRequired: true, sortOrder: 1,
      options: [{ id: 'o2', text: 'Второй', sortOrder: 2 }, { id: 'o1', text: 'Первый', sortOrder: 1 }],
    }, status: 201, statusText: 'Created', headers: {}, config };
  } });
  const question = await createFormsClient(http).createQuestion(uuid, {
    text: 'Выберите варианты', type: 'multiple_choice', isRequired: true, options: [' Первый ', 'Второй'],
  });
  assert.equal(question.type, 'multiple_choice');
  assert.deepEqual(question.options.map(option => option.id), ['o1', 'o2']);
});
