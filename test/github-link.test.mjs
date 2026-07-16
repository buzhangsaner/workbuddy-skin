import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('switcher ends with an accessible safe GitHub repository link', async () => {
  const [renderer, css] = await Promise.all([
    read('assets/renderer-inject.js'),
    read('assets/dream-skin.css'),
  ]);
  assert.match(renderer, /const GITHUB_URL = 'https:\/\/github\.com\/buzhangsaner\/workbuddy-skin\/'/);
  assert.match(renderer, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/);
  assert.match(renderer, /link\.target = '_blank'/);
  assert.match(renderer, /link\.rel = 'noopener noreferrer'/);
  assert.match(renderer, /link\.setAttribute\('aria-label', '在 GitHub 打开 WorkBuddy Skin'\)/);
  assert.match(renderer, /createGitHubLink\(\)/);
  assert.match(css, /\.wb-dream-github-link\s*\{[^}]*-webkit-app-region:\s*no-drag/s);
  assert.match(css, /\.wb-dream-github-link:focus-visible/);
});
