import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCreateDraftRequest, CreateFormResponseError, FormOwnerError, FormsResponseError,
  mergeCreatedForms, parseCreatedForm, parseForms,
} from '../src/api/formsData.ts';

const form = {
  id: 1, title: 'Опрос команды', description: 'Ваше мнение',
  status: 'Draft', responsesCount: 12, updatedAt: '2026-10-29T09:00:00Z',
};

test('normalizes numeric ids and server status casing, preserves real response count', () => {
  assert.deepEqual(parseForms([form]), [{ ...form, id: '1', status: 'draft' }]);
  assert.deepEqual(parseForms([]), []);
});

test('does not invent a response count when the API omits it', () => {
  const result = parseForms([{ ...form, responsesCount: undefined, description: null }]);
  assert.equal(result[0].responsesCount, null);
  assert.equal(result[0].description, '');
});

test('rejects invalid responses before they can crash the UI or look like an empty account', () => {
  for (const data of [null, '<html>Not found</html>', { items: [form] }, [null],
    [{ ...form, updatedAt: 'not-a-date' }], [{ ...form, responsesCount: -1 }],
    [{ ...form, responsesCount: '12' }], [form, { ...form, id: '1' }]]) {
    assert.throws(() => parseForms(data), FormsResponseError);
  }
});

test('keeps unfamiliar statuses visible instead of dropping server forms', () => {
  assert.equal(parseForms([{ ...form, status: 'Archived' }])[0].status, 'archived');
});

const payload = { title: '  Обратная связь  ', description: '  Ваше мнение  ' };

test('uses the documented draft endpoint, owner query and JSON body', () => {
  assert.deepEqual(buildCreateDraftRequest(payload, '42'), {
    url: '/CreationForms/draft', params: { ownerId: 42 },
    body: { title: 'Обратная связь', description: 'Ваше мнение' },
  });
  assert.equal(buildCreateDraftRequest({ title: 'Форма', description: '' }, 42).body.description, '');
});

test('never coerces UUIDs or missing IDs to a different numeric owner', () => {
  for (const id of [undefined, null, '', ' ', '0', '1abc', '1.5', '1e2', '0x10',
    '12345678-1234-1234-1234-123456789abc', 0, -1, 1.5, NaN, Infinity, true, 2147483648]) {
    assert.throws(() => buildCreateDraftRequest(payload, id), FormOwnerError);
  }
});

test('reads the actual formId response and builds a draft without invented metadata', () => {
  assert.deepEqual(parseCreatedForm({ formId: 12, message: 'Черновик успешно создан' }, payload), {
    id: '12', title: 'Обратная связь', description: 'Ваше мнение',
    status: 'draft', responsesCount: null, updatedAt: null,
  });
  for (const data of [null, '<html>Not found</html>', [], {}, { message: 'ok' }, { id: 12 },
    { formId: '' }, { formId: '12' }, { formId: 0 }, { formId: -1 }, { formId: true }, { formId: 1.5 }]) {
    assert.throws(() => parseCreatedForm(data, payload), CreateFormResponseError);
  }
});

test('keeps a confirmed draft visible when a slow or failed list request has no new form yet', () => {
  const created = parseCreatedForm({ formId: 12 }, payload);
  const existing = parseForms([form]);
  assert.deepEqual(mergeCreatedForms([], [created]), [created]);
  assert.deepEqual(mergeCreatedForms(existing, [created]), [created, ...existing]);
});

test('refresh merges the same ID without duplication and prefers server metadata', () => {
  const created = parseCreatedForm({ formId: 12 }, payload);
  const existing = parseForms([form, { ...form, id: 12, status: 'Published', responsesCount: 4 }]);
  const merged = mergeCreatedForms(existing, [created]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, '12');
  assert.equal(merged[0].status, 'published');
  assert.equal(merged[0].responsesCount, 4);
});
