import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalForm, LocalFormsError, localFormsKey, readLocalForms } from '../src/api/localForms.ts';

const owner = '12345678-1234-1234-1234-123456789abc';
const payload = { title: '  Опрос команды  ', description: '  Ваше мнение  ' };

function memoryStorage(data = new Map<string, string>()) {
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

test('saves a draft for a UUID account and reads it after recreating the storage adapter', () => {
  const data = new Map<string, string>();
  const saved = createLocalForm(memoryStorage(data), owner, payload);
  assert.equal(saved.title, 'Опрос команды');
  assert.equal(saved.description, 'Ваше мнение');
  assert.equal(saved.status, 'draft');
  assert.match(saved.id, /^local-/);
  assert.deepEqual(readLocalForms(memoryStorage(data), owner), [saved]);
});

test('keeps accounts separate and puts new drafts first', () => {
  const storage = memoryStorage();
  const first = createLocalForm(storage, owner, payload);
  const second = createLocalForm(storage, owner, { title: 'Новая форма', description: '' });
  assert.notEqual(first.id, second.id);
  assert.deepEqual(readLocalForms(storage, owner), [second, first]);
  assert.deepEqual(readLocalForms(storage, 'another-user-uuid'), []);
  assert.throws(() => createLocalForm(storage, undefined, payload), LocalFormsError);
});

test('does not report success or lose existing drafts when storage rejects a write', () => {
  const storage = memoryStorage();
  const first = createLocalForm(storage, owner, payload);
  const fullStorage = { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.throws(() => createLocalForm(fullStorage, owner, payload), /не смог сохранить/);
  assert.deepEqual(readLocalForms(storage, owner), [first]);
});

test('does not overwrite corrupted or unsupported saved data', () => {
  for (const saved of ['{invalid', '{"version":2,"forms":[]}', '{"version":1,"forms":[{}]}']) {
    const storage = memoryStorage();
    storage.setItem(localFormsKey(owner), saved);
    assert.throws(() => readLocalForms(storage, owner), /Данные в браузере не изменены/);
    assert.throws(() => createLocalForm(storage, owner, payload), LocalFormsError);
    assert.equal(storage.getItem(localFormsKey(owner)), saved);
  }
});

test('rejects empty titles and reports denied storage access', () => {
  const storage = memoryStorage();
  assert.throws(() => createLocalForm(storage, owner, { title: '   ', description: '' }), LocalFormsError);
  assert.deepEqual(readLocalForms(storage, owner), []);
  const deniedStorage = { ...storage, getItem: () => { throw new Error('SecurityError'); } };
  assert.throws(() => readLocalForms(deniedStorage, owner), /хранилище браузера/);
});
