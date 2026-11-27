import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { createDemoFormsStore, DEMO_FORMS_KEY } from '../src/api/demoForms.ts';
import { createFormsClient } from '../src/api/formsClient.ts';
import { FormsError, mergeCreatedForms, parseForms, parseCreatedForm } from '../src/api/formsData.ts';

function storage(data = new Map<string, string>()) {
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
const payload = { title: '  Опрос курса  ', description: '  Ваше мнение  ' };
const question = { text: 'Ваше мнение?', type: 'short_text' as const, isRequired: true, options: [] };
const uuid = '12345678-1234-4234-8234-123456789abc';

test('list, creation, details, questions and publication share persisted demo forms', async () => {
  const data = new Map<string, string>();
  const http = axios.create({ adapter: async () => { throw new Error('Demo must not request the backend'); } });
  const client = createFormsClient(http, () => createDemoFormsStore(storage(data)));
  const created = await client.createForm(payload);
  assert.equal((await client.getForms())[0].id, created.id);
  assert.equal((await client.getFormById(created.id)).title, 'Опрос курса');
  await assert.rejects(client.publishForm(created.id), /хотя бы один вопрос/);
  await client.patchForm(created.id, { title: 'Новое название', description: '' });
  const added = await client.createQuestion(created.id, question);
  const published = await client.publishForm(created.id);
  assert.equal(published.status, 'published');
  const reloaded = createFormsClient(http, () => createDemoFormsStore(storage(data)));
  const list = await reloaded.getForms();
  assert.equal(list.find(form => form.id === created.id)?.title, 'Новое название');
  assert.equal(list.find(form => form.id === created.id)?.status, 'published');
  const details = await reloaded.getFormById(created.id);
  assert.equal(details.description, '');
  assert.equal(details.questions?.[0].id, added.id);
  assert.equal(details.questionsCount, 1);
  await assert.rejects(reloaded.publishForm(created.id), /только черновик/);
});

test('demo aliases refer to the same forms and unknown IDs are not invented', () => {
  const store = createDemoFormsStore(storage());
  assert.equal(store.list().length, 3);
  store.patch('demo', { title: 'Переименована' });
  assert.equal(store.get('1').title, 'Переименована');
  assert.equal(store.get('demo-active').id, '2');
  assert.throws(() => store.get('missing'), error => error instanceof FormsError && error.status === 404);
});

test('invalid input, corrupt storage and rejected writes never lose an existing form', () => {
  const data = new Map<string, string>();
  const adapter = storage(data);
  const store = createDemoFormsStore(adapter);
  const created = store.create(payload);
  const original = data.get(DEMO_FORMS_KEY);
  assert.throws(() => store.create({ title: ' ', description: '' }), FormsError);
  assert.throws(() => store.addQuestion(created.id, { ...question, type: 'single_choice', options: ['Один'] }), FormsError);
  const failing = createDemoFormsStore({ ...adapter, setItem: () => { throw new Error('QuotaExceeded'); } });
  assert.throws(() => failing.patch(created.id, { title: 'Не сохранится' }), /Не удалось сохранить/);
  assert.equal(data.get(DEMO_FORMS_KEY), original);
  adapter.setItem(DEMO_FORMS_KEY, '{broken');
  assert.throws(() => store.create(payload), /данные не изменены/);
  assert.equal(data.get(DEMO_FORMS_KEY), '{broken');
});

test('real API creates by JWT ownership and uses returned UUID for the detail route', async () => {
  const calls: { method?: string; url?: string; body: unknown; params: unknown }[] = [];
  const form = { id: uuid, title: 'Опрос курса', description: '', status: 'draft', createdAt: '2026-11-18T10:00:00Z', questions: [] };
  const http = axios.create({ adapter: async config => {
    calls.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data), params: config.params });
    const data = config.url === '/forms/draft' ? { formId: uuid } : config.url === '/forms' ? [form] : form;
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createFormsClient(http, () => null);
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

test('the forms list uses the saved title and PATCH timestamp when the listing is stale', async () => {
  const older = '2026-11-18T10:00:00Z';
  const saved = '2026-11-18T11:00:00Z';
  const newer = '2026-11-18T12:00:00Z';
  const form = { id: uuid, title: 'Опрос курса', description: '', status: 'published', responsesCount: 7 };
  let listedForm = { ...form, updatedAt: older };
  const http = axios.create({ adapter: async config => ({
    data: config.method === 'patch'
      ? { id: uuid, title: 'Новое название', description: '', status: 'published', updatedAt: saved }
      : [listedForm],
    status: 200, statusText: 'OK', headers: {}, config,
  }) });
  const client = createFormsClient(http, () => null);

  await client.patchForm(uuid, { title: 'Новое название' });
  const [updated] = await client.getForms();
  assert.equal(updated.title, 'Новое название');
  assert.equal(updated.updatedAt, saved);
  assert.equal(updated.responsesCount, 7);

  listedForm = { ...form, title: 'Следующее изменение', updatedAt: newer };
  assert.equal((await client.getForms())[0].updatedAt, newer);
  listedForm = { ...form, updatedAt: older };
  client.clearFormListChanges();
  assert.equal((await client.getForms())[0].title, form.title);
});

test('real API failures never fall back to demo data or simulated publication', async () => {
  for (const status of [401, 403, 404, 500, undefined]) {
    const http = axios.create({ adapter: async config => {
      const response = status ? { status, statusText: 'error', data: {}, headers: {}, config } : undefined;
      throw new AxiosError('Failed', 'ERR_NETWORK', config, undefined, response);
    } });
    const client = createFormsClient(http, () => null);
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
