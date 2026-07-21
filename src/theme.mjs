const TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'id',
  'name',
  'tagline',
  'quote',
  'image',
  'colors',
  'presentation',
]);
const COLOR_KEYS = ['accent', 'secondary', 'surface', 'ink'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{1,47}$/;
const SAFE_IMAGE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}\.(?:png|jpe?g|webp)$/i;

function cleanText(value, label, maxLength) {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  const result = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!result || result.length > maxLength) throw new Error(`${label} is empty or too long`);
  return result;
}

export function normalizeTheme(input) {
  return {
    ...input,
    name: cleanText(input.name, 'name', 64),
    tagline: cleanText(input.tagline, 'tagline', 100),
    quote: cleanText(input.quote, 'quote', 80),
  };
}

export function validateTheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('theme must be an object');
  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_KEYS.has(key)) throw new Error(`Unknown theme field: ${key}`);
  }
  const theme = normalizeTheme(input);
  if (theme.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
  if (typeof theme.id !== 'string' || !SAFE_ID.test(theme.id)) throw new Error('id is invalid');
  if (typeof theme.image !== 'string' || !SAFE_IMAGE.test(theme.image)) throw new Error('image is invalid');
  if (!theme.colors || typeof theme.colors !== 'object' || Array.isArray(theme.colors)) throw new Error('colors must be an object');
  const colorKeys = Object.keys(theme.colors).sort();
  if (colorKeys.join(',') !== [...COLOR_KEYS].sort().join(',')) throw new Error('colors has unknown or missing fields');
  for (const key of COLOR_KEYS) {
    if (typeof theme.colors[key] !== 'string' || !HEX_COLOR.test(theme.colors[key])) throw new Error(`${key} is invalid`);
  }
  if (theme.presentation != null) {
    if (!theme.presentation || typeof theme.presentation !== 'object' || Array.isArray(theme.presentation)) throw new Error('presentation must be an object');
    if (Object.keys(theme.presentation).sort().join(',') !== 'fit,position') throw new Error('presentation has unknown or missing fields');
    if (!['cover', 'contain'].includes(theme.presentation.fit)) throw new Error('presentation.fit is invalid');
    if (!['left center', 'center center', 'right center'].includes(theme.presentation.position)) throw new Error('presentation.position is invalid');
  }
  return theme;
}
