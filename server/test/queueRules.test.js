import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/queueRules.js';

test('allows the supported queue lifecycle', () => {
  assert.equal(canTransition('WAITING', 'CALLED'), true);
  assert.equal(canTransition('CALLED', 'SERVING'), true);
  assert.equal(canTransition('SERVING', 'COMPLETED'), true);
});

test('rejects invalid queue transitions', () => {
  assert.equal(canTransition('COMPLETED', 'SERVING'), false);
  assert.equal(canTransition('WAITING', 'COMPLETED'), false);
});
