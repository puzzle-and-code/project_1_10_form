import assert from 'node:assert/strict';
import test from 'node:test';
import { loginBody, registrationBody } from '../src/api/authContract.ts';
import { validateEmail, validateName } from '../src/utils/authValidation.ts';

test('requires email for login and accepts real names with spaces or Cyrillic', () => {
  assert.notEqual(validateEmail('alex_1'), '');
  assert.equal(validateEmail(' alex@example.com '), '');
  assert.notEqual(validateEmail('alex@'), '');
  assert.equal(validateName(' Анна Иванова '), '');
  assert.notEqual(validateName('   '), '');
  assert.notEqual(validateName('a'.repeat(101)), '');
});

test('login trims email but preserves the password', () => {
  assert.deepEqual(loginBody({ email: ' alex@example.com ', password: ' password ' }), {
    email: 'alex@example.com', password: ' password ',
  });
});

test('registration maps profile name to the actual server contract and preserves the password', () => {
  assert.deepEqual(registrationBody({ name: ' Анна Иванова ', email: ' alex@example.com ', password: ' password ' }), {
    display_name: 'Анна Иванова', email: 'alex@example.com', password: ' password ',
  });
});
