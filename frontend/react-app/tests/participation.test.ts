import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { createDemoFormsStore, DEMO_FORMS_KEY } from '../src/api/demoForms.ts';
import { createFormsClient } from '../src/api/formsClient.ts';
import { createPublicFormsClient } from '../src/api/publicFormsClient.ts';
import { FormsError, type QuestionDto } from '../src/api/formsData.ts';
import { parsePublicForm, validateAnswers } from '../src/api/formResponses.ts';

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const store = createDemoFormsStore(storage);
  const form = store.create({ title: 'Анкета', description: '' });
  const questions = (['short_text', 'number', 'single_choice', 'multiple_choice'] as const).map(type =>
    store.addQuestion(form.id, { text: type, type, isRequired: true, options: ['Один', 'Два'] }));
  const optional = store.addQuestion(form.id, { text: 'Необязательный', type: 'short_text', isRequired: false, options: [] });
  const drafts = {
    [questions[0].id]: '  Привет  ', [questions[1].id]: '0',
    [questions[2].id]: questions[2].options[0].id,
    [questions[3].id]: questions[3].options.map(option => option.id), [optional.id]: '  ',
  };
  return { data, storage, store, form, questions, drafts };
}

test('participant validates all four types, whitespace, zero, decimal comma and option IDs', () => {
  const { store, form, questions, drafts } = setup();
  const all = store.get(form.id).questions!;
  assert.equal(Object.keys(validateAnswers(all, {}).errors).length, 4);
  const valid = validateAnswers(all, drafts);
  assert.equal(valid.valid, true);
  assert.equal(valid.answers.length, 4);
  assert.equal(valid.answers[0].value, 'Привет');
  assert.equal(valid.answers[1].value, 0);
  assert.equal(validateAnswers(all, { ...drafts, [questions[1].id]: '-4,5' }).answers[1].value, -4.5);
  for (const invalid of ['Infinity', 'NaN', '0x10', '1e9999', ' ']) {
    assert.equal(validateAnswers(all, { ...drafts, [questions[1].id]: invalid }).valid, false);
  }
  assert.equal(validateAnswers(all, { ...drafts, [questions[2].id]: 'unknown-option' }).valid, false);
  assert.equal(validateAnswers(all, { ...drafts, [questions[3].id]: ['unknown-option'] }).valid, false);
  assert.equal(validateAnswers([{ ...questions[0], type: 'unsupported', isRequired: false }], {}).valid, false);
});

test('order persists, participant follows it, and duplicate/missing/foreign question IDs are rejected', () => {
  const { store, storage, form } = setup();
  const original = store.get(form.id).questions!;
  const ids = original.map(question => question.id).reverse();
  store.reorderQuestions(form.id, ids);
  const reloaded = createDemoFormsStore(storage);
  assert.deepEqual(reloaded.get(form.id).questions!.map(question => question.id), ids);
  assert.deepEqual(reloaded.get(form.id).questions!.map(question => question.sortOrder), [0, 1, 2, 3, 4]);
  for (const invalid of [ids.slice(1), [...ids, 'extra'], ids.map(() => ids[0]), ['other', ...ids.slice(1)]]) {
    assert.throws(() => reloaded.reorderQuestions(form.id, invalid), error => error instanceof FormsError && error.status === 409);
  }
  reloaded.publish(form.id);
  assert.deepEqual(reloaded.getPublic(form.id).questions!.map(question => question.id), ids);
});

test('anonymous demo submission persists once, updates counter, survives edits and retries', async () => {
  const { store, storage, data, form, questions, drafts } = setup();
  const http = axios.create({ adapter: async () => { throw new Error('Demo cannot call API'); } });
  const client = createPublicFormsClient(http, () => createDemoFormsStore(storage));
  await assert.rejects(client.getForm(form.id), /не опубликована/);
  store.publish(form.id);
  assert.equal((await client.getForm(form.id)).id, form.id);
  await assert.rejects(client.submitResponse(form.id, { submissionId: 'empty', answers: [] }), /Проверьте ответы/);
  const payload = { submissionId: crypto.randomUUID(), answers: validateAnswers(questions, drafts).answers };
  const receipt = await client.submitResponse(form.id, payload);
  assert.deepEqual(await client.submitResponse(form.id, payload), receipt);
  await assert.rejects(client.submitResponse(form.id, { ...payload, answers: [] }), error => error instanceof FormsError && error.status === 409);
  store.patch(form.id, { title: 'Новое название' });
  store.reorderQuestions(form.id, store.get(form.id).questions!.map(question => question.id).reverse());
  store.create({ title: 'Ещё форма', description: '' });
  const persisted = JSON.parse(data.get(DEMO_FORMS_KEY)!);
  assert.equal(persisted.responses.length, 1);
  assert.deepEqual(persisted.responses[0].answers, payload.answers);
  assert.equal(createDemoFormsStore(storage).list().find(item => item.id === form.id)!.responsesCount, 1);
  await assert.rejects(client.getForm('unknown'), error => error instanceof FormsError && error.status === 404);
});

test('closed forms, storage failures and legacy storage never produce false success or lose answers', () => {
  const { store, storage, data, form, questions, drafts } = setup();
  store.publish(form.id);
  const payload = { submissionId: 'submit', answers: validateAnswers(questions, drafts).answers };
  const original = data.get(DEMO_FORMS_KEY);
  const failing = createDemoFormsStore({ ...storage, setItem: () => { throw new Error('QuotaExceeded'); } });
  assert.throws(() => failing.submitResponse(form.id, payload), /Не удалось сохранить/);
  assert.throws(() => failing.reorderQuestions(form.id, store.get(form.id).questions!.map(question => question.id).reverse()), /Не удалось сохранить/);
  assert.equal(data.get(DEMO_FORMS_KEY), original);
  assert.equal(store.get(form.id).responsesCount, 0);
  storage.setItem(DEMO_FORMS_KEY, JSON.stringify({ version: 1, forms: store.list() }));
  store.submitResponse(form.id, payload); // Existing v1 envelopes did not have responses.
  const closed = JSON.parse(data.get(DEMO_FORMS_KEY)!);
  closed.forms.find((item: { id: string }) => item.id === form.id).status = 'closed';
  storage.setItem(DEMO_FORMS_KEY, JSON.stringify(closed));
  assert.throws(() => store.getPublic(form.id), error => error instanceof FormsError && error.status === 410);
  assert.throws(() => store.submitResponse(form.id, { ...payload, submissionId: 'next' }), /завершён/);
  assert.throws(() => store.reorderQuestions(form.id, []), /завершён/);
  const corrupted = { ...closed, responses: [{ invalid: true }] };
  const saved = JSON.stringify(corrupted);
  storage.setItem(DEMO_FORMS_KEY, saved);
  assert.throws(() => store.create({ title: 'Не потерять ответы', description: '' }), /данные не изменены/);
  assert.equal(data.get(DEMO_FORMS_KEY), saved);
});

test('real public API uses proposed anonymous paths and preserves submission ID on retry', async () => {
  const calls: { method?: string; url?: string; body: unknown; authorization: unknown }[] = [];
  const question: QuestionDto = { id: 'q1', text: 'Ответ?', type: 'short_text', isRequired: true, sortOrder: 0, options: [] };
  const receipt = { responseId: 'r1', submittedAt: '2026-11-18T12:00:00Z' };
  const http = axios.create({ adapter: async config => {
    calls.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data), authorization: config.headers.Authorization });
    const data = config.method === 'post' ? receipt : { id: 'f1', title: 'Форма', status: 'published', questions: [question] };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createPublicFormsClient(http, () => null);
  await client.getForm('f1');
  const payload = { submissionId: 'stable-id', answers: [{ questionId: 'q1', value: 'Ответ' }] };
  assert.deepEqual(await client.submitResponse('f1', payload), receipt);
  await client.submitResponse('f1', payload);
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['get', '/public/forms/f1'], ['post', '/public/forms/f1/responses'], ['post', '/public/forms/f1/responses'],
  ]);
  assert.deepEqual(calls[1].body, payload);
  assert.deepEqual(calls[2].body, payload);
  assert.ok(calls.every(call => call.authorization === undefined));
  assert.throws(() => parsePublicForm({ id: 'f1', title: 'Форма', status: 'draft', questions: [question] }), /не опубликована/);
});

test('real reorder and public failures are reported without demo fallback', async () => {
  for (const status of [401, 403, 404, 409, 410, 422, 500, undefined]) {
    const http = axios.create({ adapter: async config => {
      throw new AxiosError('Failed', 'ERR_NETWORK', config, undefined, status ? { data: {}, status, statusText: 'Error', headers: {}, config } : undefined);
    } });
    const publicClient = createPublicFormsClient(http, () => null);
    await assert.rejects(publicClient.getForm('f1'), error => error instanceof FormsError && error.status === status);
    await assert.rejects(publicClient.submitResponse('f1', { submissionId: 's1', answers: [] }), FormsError);
    await assert.rejects(createFormsClient(http, () => null).reorderQuestions('f1', ['q1']), FormsError);
  }
});

test('real order sends a complete list and accepts only a matching server confirmation', async () => {
  const questions: QuestionDto[] = ['q2', 'q1'].map((id, sortOrder) => ({ id, sortOrder, text: id, type: 'short_text', isRequired: false, options: [] }));
  let malformed = false;
  const http = axios.create({ adapter: async config => {
    assert.equal(config.method, 'patch');
    assert.equal(config.url, '/forms/f1/questions/order');
    assert.deepEqual(JSON.parse(config.data), { questionIds: ['q2', 'q1'] });
    return { data: { questions: malformed ? [questions[0]] : [...questions].reverse() }, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createFormsClient(http, () => null);
  assert.deepEqual(await client.reorderQuestions('f1', ['q2', 'q1']), questions);
  malformed = true;
  await assert.rejects(client.reorderQuestions('f1', ['q2', 'q1']), /другой порядок/);
});
