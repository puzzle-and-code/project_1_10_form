import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { createFormsClient } from '../src/api/formsClient.ts';
import { createPublicFormsClient } from '../src/api/publicFormsClient.ts';
import { FormsError, type QuestionDto } from '../src/api/formsData.ts';
import { parsePublicForm, parseResponseReceipt, validateAnswers } from '../src/api/formResponses.ts';

function answerFixture() {
  const questions: QuestionDto[] = ['short_text', 'number', 'single_choice', 'multiple_choice'].map((type, index) => ({
    id: 'q' + index, text: type, type, isRequired: true, sortOrder: index + 1,
    options: type.endsWith('choice') ? [
      { id: 'option-1', text: 'Один', sortOrder: 1 },
      { id: 'option-2', text: 'Два', sortOrder: 2 },
    ] : [],
  }));
  const all = [...questions, { id: 'optional', text: 'Необязательный', type: 'short_text', isRequired: false, sortOrder: 5, options: [] }];
  const drafts = { q0: '  Привет  ', q1: '0', q2: 'option-1', q3: ['option-1', 'option-2'], optional: '  ' };
  return { all, questions, drafts };
}

test('participant validates all four types, whitespace, zero, decimal comma and option IDs', () => {
  const { all, questions, drafts } = answerFixture();
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

test('real public API uses proposed anonymous paths and preserves submission ID on retry', async () => {
  const calls: { method?: string; url?: string; body: unknown; authorization: unknown }[] = [];
  const question: QuestionDto = { id: 'q1', text: 'Ответ?', type: 'short_text', isRequired: true, sortOrder: 0, options: [] };
  const receipt = { responseId: 'r1', submittedAt: '2026-11-18T12:00:00Z' };
  const http = axios.create({ adapter: async config => {
    calls.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data), authorization: config.headers.Authorization });
    const data = config.method === 'post' ? receipt : { id: 'f1', title: 'Форма', status: 'published', questions: [question] };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createPublicFormsClient(http);
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

test('reorder and public failures are reported without inventing results', async () => {
  for (const status of [400, 401, 403, 404, 409, 410, 422, 500, undefined]) {
    const http = axios.create({ adapter: async config => {
      throw new AxiosError('Failed', 'ERR_NETWORK', config, undefined, status ? { data: {}, status, statusText: 'Error', headers: {}, config } : undefined);
    } });
    const publicClient = createPublicFormsClient(http);
    await assert.rejects(publicClient.getForm('f1'), error => error instanceof FormsError && error.status === status);
    await assert.rejects(publicClient.submitResponse('f1', { submissionId: 's1', answers: [] }), FormsError);
    await assert.rejects(createFormsClient(http).reorderQuestions('f1', ['q1']), FormsError);
  }
});

test('real order sends a complete list and accepts only a matching server confirmation', async () => {
  const questions: QuestionDto[] = ['q2', 'q1'].map((id, index) => ({ id, sortOrder: index + 1, text: id, type: 'short_text', isRequired: false, options: [] }));
  let malformed = false;
  const http = axios.create({ adapter: async config => {
    assert.equal(config.method, 'put');
    assert.equal(config.url, '/forms/f1/questions/reorder');
    assert.deepEqual(JSON.parse(config.data), { questionIds: ['q2', 'q1'] });
    return { data: { questions: malformed ? [questions[0]] : [...questions].reverse() }, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createFormsClient(http);
  assert.deepEqual(await client.reorderQuestions('f1', ['q2', 'q1']), questions);
  malformed = true;
  await assert.rejects(client.reorderQuestions('f1', ['q2', 'q1']), /другой порядок/);
});

test('closed forms and incomplete submission receipts never become a success', () => {
  const { questions } = answerFixture();
  assert.throws(() => parsePublicForm({ id: 'f1', title: 'Форма', status: 'closed', questions }), error => error instanceof FormsError && error.status === 410);
  for (const receipt of [null, {}, { responseId: 'r1' }, { responseId: 'r1', submittedAt: 'invalid' }]) {
    assert.throws(() => parseResponseReceipt(receipt), FormsError);
  }
});

test('a fresh client reads the confirmed question order from form details', async () => {
  let stored: QuestionDto[] = ['q1', 'q2', 'q3'].map((id, index) => ({ id, text: id, type: 'short_text', isRequired: false, sortOrder: index + 1, options: [] }));
  const http = axios.create({ adapter: async config => {
    let data: unknown;
    if (config.method === 'put') {
      assert.equal(config.url, '/forms/f1/questions/reorder');
      const { questionIds } = JSON.parse(config.data) as { questionIds: string[] };
      assert.equal(questionIds.length, stored.length);
      stored = questionIds.map((id, index) => ({ ...stored.find(question => question.id === id)!, sortOrder: index + 1 }));
      data = { questions: stored };
    } else {
      assert.equal(config.method, 'get');
      assert.equal(config.url, '/forms/f1');
      data = { id: 'f1', title: 'Форма', status: 'draft', questions: [...stored].reverse() };
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } });
  await createFormsClient(http).reorderQuestions('f1', ['q3', 'q1', 'q2']);
  const loaded = await createFormsClient(http).getFormById('f1');
  assert.deepEqual(loaded.questions?.map(question => question.id), ['q3', 'q1', 'q2']);
  assert.deepEqual(loaded.questions?.map(question => question.sortOrder), [1, 2, 3]);
});

test('invalid input and inconsistent server positions cannot confirm a reorder', async () => {
  let calls = 0;
  const http = axios.create({ adapter: async config => {
    calls++;
    return { data: { questions: ['q2', 'q1'].map(id => ({ id, text: id, type: 'short_text', isRequired: true, sortOrder: 1, options: [] })) }, status: 200, statusText: 'OK', headers: {}, config };
  } });
  const client = createFormsClient(http);
  for (const ids of [[], ['q1', 'q1'], ['q1', ' ']]) await assert.rejects(client.reorderQuestions('f1', ids), FormsError);
  assert.equal(calls, 0);
  await assert.rejects(client.reorderQuestions('f1', ['q2', 'q1']), /другой порядок/);
});

test('server validation errors are readable when saving order', async () => {
  const http = axios.create({ adapter: async config => {
    throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, {
      data: { errors: { QuestionIds: ['Список вопросов изменился. Обновите страницу.'] } },
      status: 400, statusText: 'Bad Request', headers: {}, config,
    });
  } });
  await assert.rejects(createFormsClient(http).reorderQuestions('f1', ['q1']), /Список вопросов изменился/);
});
