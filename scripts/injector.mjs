#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateTheme } from '../src/theme.mjs';
import { buildRendererExpression } from '../src/payload.mjs';
import { isAllowedDebuggerUrl, isCandidateWorkBuddyTarget } from '../src/security.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const value = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const port = Number(value('--port', '9336'));
const themeDir = path.resolve(value('--theme-dir', path.join(root, 'themes', 'pink-custom')));
const screenshot = value('--screenshot', '');
const remove = args.includes('--remove');
const verifyOnly = args.includes('--verify');
const respectSelection = args.includes('--respect-selection');
const once = args.includes('--once') || remove || verifyOnly;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid CDP port');

async function loadTheme(directory, listed) {
  const theme = validateTheme(JSON.parse(await readFile(path.join(directory, 'theme.json'), 'utf8')));
  const imagePath = path.resolve(directory, theme.image);
  if (!imagePath.startsWith(directory + path.sep)) throw new Error('Theme image escapes its directory');
  const info = await stat(imagePath);
  if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('Theme image is invalid or exceeds 16 MB');
  return { ...theme, imageUrl: pathToFileURL(imagePath).href, listed };
}

async function payload() {
  const themesRoot = path.resolve(root, 'themes');
  const catalog = JSON.parse(await readFile(path.join(themesRoot, 'catalog.json'), 'utf8'));
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('Theme catalog is empty');
  const themes = [];
  for (const item of catalog) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id)) throw new Error('Theme catalog contains an invalid id');
    const directory = path.resolve(themesRoot, item.id);
    if (!directory.startsWith(themesRoot + path.sep)) throw new Error('Theme catalog path escapes themes directory');
    const theme = await loadTheme(directory, true);
    if (theme.id !== item.id) throw new Error(`Theme catalog id mismatch: ${item.id}`);
    themes.push(theme);
  }
  const requestedTheme = await loadTheme(themeDir, themes.some(theme => theme.id === path.basename(themeDir)));
  if (!themes.some(theme => theme.id === requestedTheme.id)) themes.push({ ...requestedTheme, listed: false });
  return buildRendererExpression({
    css: await readFile(path.join(root, 'assets', 'dream-skin.css'), 'utf8'),
    integrationSource: await readFile(path.join(root, 'assets', 'renderer-inject.js'), 'utf8'),
    themes,
    requestedThemeId: requestedTheme.id,
    forceSelection: !respectSelection,
  });
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout')), 5000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed')); }, { once: true });
    });
    this.ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const waiter = this.pending.get(message.id); this.pending.delete(message.id);
      if (waiter?.timer) clearTimeout(waiter.timer);
      message.error ? waiter?.reject(new Error(message.error.message)) : waiter?.resolve(message.result);
    });
  }
  call(method, params = {}, timeoutMs = 10000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { if (this.pending.delete(id)) reject(new Error(`${method} timeout`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

async function targets() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return (await response.json()).filter(t => isCandidateWorkBuddyTarget(t) && isAllowedDebuggerUrl(t.webSocketDebuggerUrl, port));
}

async function evaluate(cdp, expression) {
  const result = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Renderer evaluation failed');
  return result.result?.value;
}

const verifyExpression = `(() => { const state=window.__WORKBUDDY_DREAM_SKIN_STATE__; return {installed:document.documentElement.classList.contains('workbuddy-dream-skin')||state?.currentSelection==='native',selection:state?.currentSelection,style:!!document.getElementById('workbuddy-dream-skin-style'),chrome:!!document.getElementById('workbuddy-dream-chrome'),switcher:document.querySelectorAll('.wb-dream-theme-chip').length,pointer:getComputedStyle(document.getElementById('workbuddy-dream-chrome')).pointerEvents,overflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1}; })()`;
const removeExpression = `(() => { window.__WORKBUDDY_DREAM_SKIN_STATE__?.cleanup?.(); return !document.getElementById('workbuddy-dream-skin-style'); })()`;

async function runTarget(target, expression) {
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.call('Runtime.enable');
    if (remove) return await evaluate(cdp, removeExpression);
    if (!verifyOnly) await evaluate(cdp, expression);
    const state = await evaluate(cdp, verifyExpression);
    if (!state?.installed || !state.style || !state.chrome || state.switcher < 2 || state.pointer !== 'none' || !state.overflow) throw new Error(`Theme verification failed: ${JSON.stringify(state)}`);
    if (screenshot) {
      await cdp.call('Page.enable');
      const shot = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 30000);
      await writeFile(path.resolve(screenshot), Buffer.from(shot.data, 'base64'));
    }
    return state;
  } finally { cdp.close(); }
}

async function cycle() {
  const list = await targets();
  if (!list.length) throw new Error('WorkBuddy renderer not found; start it with remote debugging enabled');
  const expression = remove || verifyOnly ? '' : await payload();
  const results = [];
  for (const target of list) results.push(await runTarget(target, expression));
  process.stdout.write(`${JSON.stringify({ ok: true, targets: results.length, results })}\n`);
}

await cycle();
if (!once) setInterval(() => cycle().catch(error => process.stderr.write(`${error.message}\n`)), 4000);
