import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAllowedDebuggerUrl,
  isCandidateWorkBuddyTarget,
  isRecordedInjectorIdentity,
} from '../src/security.mjs';

test('accepts only loopback CDP websocket URLs on the selected port', () => {
  assert.equal(isAllowedDebuggerUrl('ws://127.0.0.1:9336/devtools/page/abc', 9336), true);
  assert.equal(isAllowedDebuggerUrl('ws://localhost:9336/devtools/page/abc', 9336), true);
  assert.equal(isAllowedDebuggerUrl('ws://192.168.1.2:9336/devtools/page/abc', 9336), false);
  assert.equal(isAllowedDebuggerUrl('ws://127.0.0.1:9222/devtools/page/abc', 9336), false);
  assert.equal(isAllowedDebuggerUrl('wss://127.0.0.1:9336/devtools/page/abc', 9336), false);
});

test('recognizes only the packaged WorkBuddy main renderer', () => {
  assert.equal(isCandidateWorkBuddyTarget({
    type: 'page',
    title: 'WorkBuddy',
    url: 'file:///C:/Users/me/AppData/Local/Programs/WorkBuddy/resources/app.asar/renderer/index.html',
  }), true);
  assert.equal(isCandidateWorkBuddyTarget({ type: 'page', title: 'WorkBuddy', url: 'https://example.com' }), false);
  assert.equal(isCandidateWorkBuddyTarget({ type: 'page', title: 'Login', url: 'file:///tmp/renderer/index.html' }), false);
  assert.equal(isCandidateWorkBuddyTarget({ type: 'worker', title: 'WorkBuddy', url: 'file:///WorkBuddy/resources/app.asar/renderer/index.html' }), false);
});

test('refuses to trust a reused or changed injector process identity', () => {
  const recorded = {
    pid: 42,
    executable: 'C:\\Program Files\\nodejs\\node.exe',
    scriptPath: 'C:\\skin\\scripts\\injector.mjs',
    startedAt: '2026-07-16T00:00:00.000Z',
  };
  assert.equal(isRecordedInjectorIdentity(recorded, { ...recorded }), true);
  assert.equal(isRecordedInjectorIdentity(recorded, { ...recorded, pid: 43 }), false);
  assert.equal(isRecordedInjectorIdentity(recorded, { ...recorded, scriptPath: 'C:\\evil.mjs' }), false);
});
