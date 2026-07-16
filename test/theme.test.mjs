import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTheme, validateTheme } from '../src/theme.mjs';

const validTheme = {
  schemaVersion: 1,
  id: 'fiona-starlight',
  name: 'Fiona Starlight',
  tagline: '让灵感在星光里发生',
  quote: 'MAKE SOMETHING WONDERFUL',
  image: 'background.png',
  colors: {
    accent: '#a142f4',
    secondary: '#ff73bd',
    surface: '#fff5fa',
    ink: '#2a1752',
  },
};

test('accepts a valid declarative theme', () => {
  assert.deepEqual(validateTheme(validTheme), validTheme);
});

test('rejects executable or escaping theme fields', () => {
  assert.throws(() => validateTheme({ ...validTheme, image: '../secret.png' }), /image/);
  assert.throws(() => validateTheme({ ...validTheme, script: 'alert(1)' }), /unknown/i);
  assert.throws(() => validateTheme({
    ...validTheme,
    colors: { ...validTheme.colors, accent: 'url(javascript:alert(1))' },
  }), /accent/);
});

test('normalizes bounded user-facing text', () => {
  const normalized = normalizeTheme({
    ...validTheme,
    name: '  Fiona   Starlight  ',
    tagline: `  星光\n主题  `,
  });
  assert.equal(normalized.name, 'Fiona Starlight');
  assert.equal(normalized.tagline, '星光 主题');
});
