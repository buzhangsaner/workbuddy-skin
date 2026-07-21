import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('manager page has semantic status, actions, theme grid, designer, and busy feedback', async () => {
  const html = await read('manager/src/index.html');
  assert.match(html, /<header\b/);
  assert.match(html, /<main\b/);
  assert.match(html, /<footer\b/);
  assert.match(html, /id="managerStatus"[^>]*aria-live="polite"/);
  assert.match(html, /id="themeGrid"/);
  assert.match(html, /id="busyOverlay"[^>]*aria-live="assertive"/);
  assert.match(html, /id="designerDialog"/);
  for (const id of ['importTheme', 'designTheme', 'refreshThemes', 'restoreTheme', 'openGitHub']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /https?:\/\/(?:fonts|cdn|unpkg|jsdelivr)/i);
});

test('renderer builds untrusted theme content with text nodes instead of HTML injection', async () => {
  const app = await read('manager/src/app.js');
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /textContent\s*=/);
  assert.match(app, /document\.createElement/);
  for (const operation of ['status', 'applyTheme', 'restore', 'importTheme', 'exportTheme', 'deleteTheme', 'openGitHub']) {
    assert.match(app, new RegExp(`api\\.${operation}\\(`));
  }
  assert.match(app, /aria-pressed/);
  assert.match(app, /setBusy/);
  assert.match(app, /showToast/);
});

test('manager uses a stable uniform card grid with responsive and accessible controls', async () => {
  const css = await read('manager/src/styles.css');
  assert.match(css, /--paper:/);
  assert.match(css, /--vermilion:/);
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(320px,\s*1fr\)\)/);
  assert.match(css, /\.theme-media[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*\.collection-head\s*>\s*strong[^}]*grid-row:\s*1/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(css, /\.theme-card:nth-child/);
  assert.match(css, /\.grain/);
});
