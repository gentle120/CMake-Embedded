import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIncomingMessage } from '../sidebar/messages';

test('accepts each supported sidebar command', () => {
  assert.deepEqual(parseIncomingMessage({ type: 'ready' }), { type: 'ready' });
  assert.deepEqual(parseIncomingMessage({ type: 'scanWorkspace' }), { type: 'scanWorkspace' });
  assert.deepEqual(parseIncomingMessage({ type: 'generateProject' }), { type: 'generateProject' });
  assert.deepEqual(parseIncomingMessage({ type: 'generateFlashScript' }), {
    type: 'generateFlashScript'
  });
  assert.deepEqual(parseIncomingMessage({ type: 'generateDebugConfiguration' }), {
    type: 'generateDebugConfiguration'
  });
  assert.deepEqual(parseIncomingMessage({ type: 'openSettings' }), { type: 'openSettings' });
});

test('keeps the selection payload for provider-side sanitization', () => {
  const selection = { mode: 'linux', nested: true };
  assert.deepEqual(parseIncomingMessage({ type: 'saveSelection', selection }), {
    type: 'saveSelection',
    selection
  });
});

test('rejects malformed messages', () => {
  assert.equal(parseIncomingMessage(undefined), undefined);
  assert.equal(parseIncomingMessage(null), undefined);
  assert.equal(parseIncomingMessage([]), undefined);
  assert.equal(parseIncomingMessage('ready'), undefined);
  assert.equal(parseIncomingMessage({}), undefined);
  assert.equal(parseIncomingMessage({ type: 'unknown' }), undefined);
  assert.equal(parseIncomingMessage({ type: 'saveSelection' }), undefined);
});
