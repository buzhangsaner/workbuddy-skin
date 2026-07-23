import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createRuntime, findWorkBuddyExecutable, validatePort } = require('../manager/core/runtime.cjs');

async function harness({ ready = true, verifySelection = 'pink-custom' } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'manager-runtime-'));
  const themeDir = path.join(root, 'themes', 'demo');
  await mkdir(themeDir, { recursive: true });
  await writeFile(path.join(themeDir, 'theme.json'), '{}');
  await mkdir(path.join(root, 'scripts'));
  await writeFile(path.join(root, 'scripts', 'injector.mjs'), '');
  const calls = [];
  let endpointReady = ready;
  const dependencies = {
    endpointReady: async port => { calls.push(['ready', port]); return endpointReady; },
    launchWorkBuddy: async payload => { calls.push(['launch', payload]); endpointReady = true; },
    runFile: async (file, args, options) => {
      calls.push(['run', file, args, options]);
      if (args.includes('--verify')) return JSON.stringify({ ok: true, results: [{ selection: verifySelection }] });
      return JSON.stringify({ ok: true, results: [{ selection: 'demo' }] });
    },
    spawnFile: (file, args, options) => { calls.push(['spawn', file, args, options]); return { pid: 4242, unref() {} }; },
    stopRecordedWatcher: async record => { calls.push(['stop', record]); return true; },
  };
  const runtime = createRuntime({
    projectRoot: root,
    stateRoot: path.join(root, 'state'),
    nodeExecutable: 'C:\\runtime\\node.exe',
    platform: 'win32',
    dependencies,
  });
  return { root, themeDir, runtime, calls };
}

test('validates the fixed loopback debugger port range', () => {
  assert.equal(validatePort(9336), 9336);
  for (const value of [0, 80, 65536, 9336.5, '9336']) assert.throws(() => validatePort(value), /port/i);
});

test('applies a theme once then starts a detached watcher that respects in-app selection', async () => {
  const { runtime, themeDir, calls, root } = await harness();
  const result = await runtime.applyTheme({ id: 'demo', dir: themeDir }, { restart: false });
  assert.equal(result.selection, 'demo');
  const injector = path.join(root, 'scripts', 'injector.mjs');
  assert.deepEqual(calls[1].slice(0, 3), ['run', 'C:\\runtime\\node.exe', [injector, '--port', '9336', '--theme-dir', themeDir, '--once']]);
  assert.deepEqual(calls[2].slice(0, 3), ['spawn', 'C:\\runtime\\node.exe', [injector, '--port', '9336', '--theme-dir', themeDir, '--respect-selection']]);
  assert.equal(calls[2][3].detached, true);
  const state = JSON.parse(await readFile(path.join(root, 'state', 'runtime.json'), 'utf8'));
  assert.deepEqual(state, { themeId: 'demo', watcherPid: 4242, injectorPath: injector });
});

test('restarts WorkBuddy only when allowed and returns stable readiness errors', async () => {
  const blocked = await harness({ ready: false });
  await assert.rejects(() => blocked.runtime.applyTheme({ id: 'demo', dir: blocked.themeDir }, { restart: false }), error => error.code === 'DEBUG_PORT_NOT_READY');
  assert.equal(blocked.calls.some(call => call[0] === 'launch'), false);

  const allowed = await harness({ ready: false });
  await allowed.runtime.applyTheme({ id: 'demo', dir: allowed.themeDir }, { restart: true });
  assert.equal(allowed.calls.some(call => call[0] === 'launch'), true);
});

test('reports live selection and removes the exact recorded watcher before cleanup', async () => {
  const { runtime, calls, root } = await harness({ verifySelection: 'purple-night' });
  await mkdir(path.join(root, 'state'), { recursive: true });
  const injector = path.join(root, 'scripts', 'injector.mjs');
  await writeFile(path.join(root, 'state', 'runtime.json'), JSON.stringify({ themeId: 'old', watcherPid: 1234, injectorPath: injector }));
  const status = await runtime.status();
  assert.equal(status.debugReady, true);
  assert.equal(status.selection, 'purple-night');
  const restored = await runtime.restore();
  assert.equal(restored.restored, true);
  assert.deepEqual(calls.find(call => call[0] === 'stop')[1], { themeId: 'old', watcherPid: 1234, injectorPath: injector });
  const removeCall = calls.find(call => call[0] === 'run' && call[2].includes('--remove'));
  assert.deepEqual(removeCall[2], [injector, '--port', '9336', '--remove', '--once']);
});

test('finds only supported WorkBuddy executable locations', () => {
  const exists = candidate => candidate.endsWith('WorkBuddy.exe') || candidate === '/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy';
  assert.equal(
    findWorkBuddyExecutable({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Local' }, exists }),
    path.join('C:\\Local', 'Programs', 'WorkBuddy', 'WorkBuddy.exe'),
  );
  assert.equal(findWorkBuddyExecutable({ platform: 'darwin', env: {}, exists }), '/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy');
  assert.equal(findWorkBuddyExecutable({ platform: 'linux', env: {}, exists: () => false }), null);
});

test('falls back to the Windows user profile when LOCALAPPDATA is missing or stale', () => {
  const home = 'C:\\Users\\Demo';
  const expected = path.join(home, 'AppData', 'Local', 'Programs', 'WorkBuddy', 'WorkBuddy.exe');
  const exists = candidate => candidate === expected;
  assert.equal(
    findWorkBuddyExecutable({ platform: 'win32', env: { LOCALAPPDATA: 'Z:\\Missing' }, home, exists }),
    expected,
  );
});
