import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const {
  MAX_ARCHIVE_BYTES,
  MAX_ENTRY_COUNT,
  exportPackage,
  importPackage,
  inspectPackage,
} = require('../manager/core/theme-package.cjs');

const manifest = (overrides = {}) => ({
  schemaVersion: 1,
  id: 'sample-theme',
  name: '示例主题',
  tagline: '安全主题',
  quote: 'SAFE THEME',
  image: 'hero.png',
  colors: {
    accent: '#123456',
    secondary: '#abcdef',
    surface: '#f6f2e9',
    ink: '#202020',
  },
  ...overrides,
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbskin-package-'));
  const themeDir = path.join(root, 'sample-theme');
  await mkdir(themeDir);
  await writeFile(path.join(themeDir, 'theme.json'), `${JSON.stringify(manifest(), null, 2)}\n`);
  await writeFile(path.join(themeDir, 'hero.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
  return { root, themeDir };
}

function writeZip(target, entries) {
  const zip = new AdmZip();
  for (const [name, data, attr] of entries) {
    zip.addFile(name, Buffer.isBuffer(data) ? data : Buffer.from(data));
    if (attr != null) zip.getEntry(name).attr = attr;
  }
  zip.writeZip(target);
}

function duplicateEntryZip(target) {
  const zip = new AdmZip();
  zip.addFile('package.json', Buffer.from(packageMeta));
  zip.addFile('theme/theme.json', Buffer.from(JSON.stringify(manifest())));
  zip.addFile('theme/hero.png', Buffer.from('one'));
  zip.addFile('theme/aero.png', Buffer.from('two'));
  const buffer = zip.toBuffer();
  const from = Buffer.from('theme/aero.png');
  const to = Buffer.from('theme/hero.png');
  for (let offset = buffer.indexOf(from); offset >= 0; offset = buffer.indexOf(from, offset + to.length)) {
    to.copy(buffer, offset);
  }
  require('node:fs').writeFileSync(target, buffer);
}

const packageMeta = JSON.stringify({ format: 'workbuddy-skin', version: 1 });

test('exports, inspects, and imports a declarative script-free theme package', async () => {
  const { root, themeDir } = await fixture();
  const output = path.join(root, 'sample.wbskin');
  const exported = exportPackage(themeDir, output);
  assert.equal(exported.id, 'sample-theme');
  const zip = new AdmZip(output);
  assert.deepEqual(zip.getEntries().map(entry => entry.entryName).sort(), [
    'package.json', 'theme/hero.png', 'theme/theme.json',
  ]);

  const inspected = inspectPackage(output);
  assert.equal(inspected.id, 'sample-theme');
  assert.equal(inspected.name, '示例主题');
  assert.equal(inspected.hasExecutableContent, false);

  const userThemes = path.join(root, 'user-themes');
  const imported = await importPackage(output, userThemes);
  assert.equal(imported.id, 'sample-theme');
  assert.equal(JSON.parse(await readFile(path.join(userThemes, 'sample-theme', 'theme.json'), 'utf8')).id, 'sample-theme');
  assert.deepEqual((await readdir(userThemes)).sort(), ['sample-theme']);
});

test('rejects executable, vector, markup, remote, and missing image content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbskin-reject-'));
  for (const [label, entries] of [
    ['javascript', [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest())], ['theme/hero.png', 'png'], ['theme/run.js', 'alert(1)']]],
    ['svg', [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest({ image: 'hero.svg' }))], ['theme/hero.svg', '<svg/>']]],
    ['html', [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest({ image: 'hero.html' }))], ['theme/hero.html', '<html/>']]],
    ['remote', [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest({ image: 'https://example.com/a.png' }))]]],
    ['missing', [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest())]]],
  ]) {
    const target = path.join(root, `${label}.wbskin`);
    writeZip(target, entries);
    assert.throws(() => inspectPackage(target), /unsafe|不允许|图片|路径|资源/i, label);
  }
});

test('rejects traversal, absolute, duplicate-normalized, and symbolic-link entries', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbskin-paths-'));
  const base = [['package.json', packageMeta], ['theme/theme.json', JSON.stringify(manifest())], ['theme/hero.png', 'png']];
  for (const [label, extra] of [
    ['traversal', ['theme/../outside.png', 'bad']],
    ['absolute', ['C:/outside.png', 'bad']],
    ['backslash-traversal', ['theme\\..\\outside.png', 'bad']],
    ['symlink', ['theme/link.png', 'target', 0xa000 << 16]],
  ]) {
    const target = path.join(root, `${label}.wbskin`);
    writeZip(target, [...base, extra]);
    assert.throws(() => inspectPackage(target), /unsafe|路径|重复|链接|不允许/i, label);
  }
  const duplicate = path.join(root, 'duplicate.wbskin');
  duplicateEntryZip(duplicate);
  assert.throws(() => inspectPackage(duplicate), /重复|duplicate/i);
});

test('enforces package entry and uncompressed size limits before extraction', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbskin-limits-'));
  const tooMany = path.join(root, 'many.wbskin');
  writeZip(tooMany, Array.from({ length: MAX_ENTRY_COUNT + 1 }, (_, index) => [`theme/file-${index}.txt`, 'x']));
  assert.throws(() => inspectPackage(tooMany), /数量|entries|files/i);

  const tooLarge = path.join(root, 'large.wbskin');
  writeZip(tooLarge, [
    ['package.json', packageMeta],
    ['theme/theme.json', JSON.stringify(manifest())],
    ['theme/hero.png', Buffer.alloc(MAX_ARCHIVE_BYTES + 1, 7)],
  ]);
  assert.throws(() => inspectPackage(tooLarge), /大小|large|limit/i);
});

test('rejects invalid IDs and refuses to overwrite an imported theme by default', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wbskin-id-'));
  const invalid = path.join(root, 'invalid.wbskin');
  writeZip(invalid, [
    ['package.json', packageMeta],
    ['theme/theme.json', JSON.stringify(manifest({ id: '../escape' }))],
    ['theme/hero.png', 'png'],
  ]);
  assert.throws(() => inspectPackage(invalid), /id/i);

  const { themeDir } = await fixture();
  const valid = path.join(root, 'valid.wbskin');
  exportPackage(themeDir, valid);
  const destination = path.join(root, 'themes');
  await importPackage(valid, destination);
  await assert.rejects(() => importPackage(valid, destination), /存在|exists/i);
});
