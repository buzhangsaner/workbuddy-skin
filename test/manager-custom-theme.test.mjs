import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const validPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const payload = imagePath => ({
  imagePath,
  name: '晨光工作台',
  tagline: '把今天的灵感放进晨光里',
  quote: 'MORNING STUDIO',
  accent: '#c44732',
  secondary: '#d9a441',
  surface: '#f5efe4',
  ink: '#24201b',
  fit: 'contain',
  position: 'left center',
});

test('creates a collision-resistant persistent user theme from a verified raster image', async () => {
  const { createCustomTheme } = require('../manager/core/custom-theme.cjs');
  const root = await mkdtemp(path.join(os.tmpdir(), 'wb-custom-'));
  const source = path.join(root, 'wallpaper.png');
  const themes = path.join(root, 'themes');
  await writeFile(source, validPng);

  const first = await createCustomTheme({ ...payload(source), userThemesRoot: themes, now: () => 1000, randomHex: () => 'a1b2c3' });
  const second = await createCustomTheme({ ...payload(source), userThemesRoot: themes, now: () => 1000, randomHex: () => 'd4e5f6' });
  assert.match(first.id, /^custom-[a-z0-9-]+$/);
  assert.notEqual(first.id, second.id);
  assert.equal((await lstat(first.imagePath)).isFile(), true);
  const manifest = JSON.parse(await readFile(path.join(first.dir, 'theme.json'), 'utf8'));
  assert.equal(manifest.id, first.id);
  assert.equal(manifest.name, '晨光工作台');
  assert.deepEqual(manifest.presentation, { fit: 'contain', position: 'left center' });
  assert.deepEqual((await readdir(themes)).sort(), [first.id, second.id].sort());
});

test('rejects spoofed, unsupported, oversized, and symbolic-link wallpaper files', async t => {
  const { createCustomTheme, MAX_WALLPAPER_BYTES } = require('../manager/core/custom-theme.cjs');
  const root = await mkdtemp(path.join(os.tmpdir(), 'wb-custom-reject-'));
  const themes = path.join(root, 'themes');

  const spoofed = path.join(root, 'spoofed.png');
  await writeFile(spoofed, '<script>alert(1)</script>');
  await assert.rejects(() => createCustomTheme({ ...payload(spoofed), userThemesRoot: themes }), /图片|格式|signature|raster/i);

  const unsupported = path.join(root, 'vector.svg');
  await writeFile(unsupported, '<svg/>');
  await assert.rejects(() => createCustomTheme({ ...payload(unsupported), userThemesRoot: themes }), /图片|格式|extension/i);

  const huge = path.join(root, 'huge.png');
  await writeFile(huge, Buffer.alloc(MAX_WALLPAPER_BYTES + 1));
  await assert.rejects(() => createCustomTheme({ ...payload(huge), userThemesRoot: themes }), /大小|large|limit/i);

  if (process.platform === 'win32') {
    t.diagnostic('Windows 未启用创建符号链接权限，跳过符号链接分支');
  } else {
    const source = path.join(root, 'source.png');
    await writeFile(source, validPng);
    const linked = path.join(root, 'linked.png');
    await symlink(source, linked);
    await assert.rejects(() => createCustomTheme({ ...payload(linked), userThemesRoot: themes }), /链接|symbolic/i);
  }
});

test('manager preview and WorkBuddy renderer honor custom wallpaper fit and position', async () => {
  const [main, app, styles, renderer, themeSource, packageSource] = await Promise.all([
    readFile(new URL('../manager/electron/main.cjs', import.meta.url), 'utf8'),
    readFile(new URL('../manager/src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../manager/src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../assets/renderer-inject.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/theme.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../manager/core/theme-package.cjs', import.meta.url), 'utf8'),
  ]);
  assert.match(main, /previewUrl:\s*pathToFileURL/);
  assert.match(app, /result\.previewUrl/);
  assert.match(app, /backgroundImage/);
  assert.match(app, /backgroundSize/);
  assert.match(app, /backgroundPosition/);
  assert.match(styles, /--preview-wallpaper/);
  assert.match(renderer, /theme\.presentation\?\.fit/);
  assert.match(renderer, /theme\.presentation\?\.position/);
  assert.match(themeSource, /presentation/);
  assert.match(packageSource, /presentation/);
});
