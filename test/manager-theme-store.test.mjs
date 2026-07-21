import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { createThemeStore, defaultStateRoot } = require('../manager/core/theme-store.cjs');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function writeTheme(root, id, overrides = {}) {
  const dir = path.join(root, id);
  await mkdir(dir, { recursive: true });
  const theme = {
    schemaVersion: 1,
    id,
    name: `用户主题 ${id}`,
    tagline: '用户主题标题',
    quote: 'USER THEME',
    image: 'hero.png',
    colors: { accent: '#123456', secondary: '#abcdef', surface: '#f6f2e9', ink: '#202020' },
    ...overrides,
  };
  await writeFile(path.join(dir, 'theme.json'), `${JSON.stringify(theme)}\n`);
  await writeFile(path.join(dir, 'hero.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]));
  return dir;
}

test('preserves built-in catalog order and appends UI-safe user themes', async () => {
  const userRoot = await mkdtemp(path.join(os.tmpdir(), 'manager-store-'));
  await writeTheme(userRoot, 'my-paper');
  const store = createThemeStore({ projectRoot, userThemesRoot: userRoot });
  const themes = store.listThemes({ activeId: 'my-paper' });
  const catalog = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(projectRoot, 'themes', 'catalog.json'), 'utf8'));
  assert.deepEqual(themes.slice(0, catalog.length).map(theme => theme.id), catalog.map(theme => theme.id));
  const user = themes.at(-1);
  assert.deepEqual(Object.keys(user).sort(), [
    'active', 'builtin', 'colors', 'description', 'id', 'imagePath', 'name', 'quote', 'source', 'tagline',
  ]);
  assert.equal(user.id, 'my-paper');
  assert.equal(user.source, 'user');
  assert.equal(user.active, true);
  assert.ok(path.resolve(user.imagePath).startsWith(path.resolve(userRoot) + path.sep));
});

test('user themes cannot replace built-ins and unsafe previews are ignored', async () => {
  const userRoot = await mkdtemp(path.join(os.tmpdir(), 'manager-store-safe-'));
  await writeTheme(userRoot, 'pink-custom', { name: '伪造内置主题' });
  await writeTheme(userRoot, 'unsafe-preview', { image: '../outside.png' });
  const store = createThemeStore({ projectRoot, userThemesRoot: userRoot });
  const themes = store.listThemes();
  assert.equal(themes.find(theme => theme.id === 'pink-custom').source, 'builtin');
  assert.equal(themes.filter(theme => theme.id === 'pink-custom').length, 1);
  assert.equal(themes.some(theme => theme.id === 'unsafe-preview'), false);
});

test('built-ins are immutable while user themes can be deleted', async () => {
  const userRoot = await mkdtemp(path.join(os.tmpdir(), 'manager-store-delete-'));
  await writeTheme(userRoot, 'delete-me');
  const store = createThemeStore({ projectRoot, userThemesRoot: userRoot });
  assert.throws(() => store.deleteUserTheme('pink-custom'), /内置|built-in/i);
  assert.equal(store.deleteUserTheme('delete-me').deleted, true);
  await assert.rejects(access(path.join(userRoot, 'delete-me')));
  assert.throws(() => store.getTheme('delete-me'), /不存在|not found/i);
});

test('default state roots follow the supported platform application-data locations', () => {
  assert.equal(
    defaultStateRoot({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Local' }, home: 'C:\\Home' }),
    path.join('C:\\Local', 'WorkBuddySkinManager'),
  );
  assert.equal(
    defaultStateRoot({ platform: 'darwin', env: {}, home: '/Users/tester' }),
    path.join('/Users/tester', 'Library', 'Application Support', 'WorkBuddySkinManager'),
  );
});
