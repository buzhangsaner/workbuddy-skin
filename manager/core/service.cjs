const fs = require('node:fs');
const path = require('node:path');
const { createThemeStore } = require('./theme-store.cjs');
const { createRuntime } = require('./runtime.cjs');
const { inspectPackage, importPackage, exportPackage } = require('./theme-package.cjs');

function validateThemeId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('主题 id 不合法');
  return value;
}

function validateDesignPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('主题设计参数无效');
  const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  for (const key of ['accent', 'secondary', 'surface', 'ink']) {
    if (!color(payload[key])) throw new Error(`颜色 ${key} 不合法`);
  }
  if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 80) throw new Error('主题名称不合法');
  if (typeof payload.tagline !== 'string' || !payload.tagline.trim() || payload.tagline.length > 120) throw new Error('主题标题不合法');
  if (typeof payload.quote !== 'string' || !payload.quote.trim() || payload.quote.length > 120) throw new Error('主题眉题不合法');
  if (!['cover', 'contain'].includes(payload.fit || 'cover')) throw new Error('图片适配方式无效');
  if (!['left center', 'center center', 'right center'].includes(payload.position || 'right center')) throw new Error('图片位置无效');
  return { ...payload };
}

function createService(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..', '..'));
  const store = options.store || createThemeStore({ projectRoot, stateRoot: options.stateRoot, userThemesRoot: options.userThemesRoot });
  const runtime = options.runtime || createRuntime({ projectRoot, stateRoot: store.stateRoot, nodeExecutable: options.nodeExecutable });

  async function status() {
    const live = await runtime.status();
    return {
      workBuddyReady: live.debugReady,
      selection: live.selection,
      themes: store.listThemes({ activeId: live.selection || '' }).map(theme => ({
        ...theme,
        previewUrl: `theme-asset://local/${theme.id}`,
      })),
    };
  }

  async function applyTheme(id, settings = {}) {
    const theme = store.getTheme(validateThemeId(id));
    return runtime.applyTheme(theme, { restart: settings?.restart === true });
  }

  async function restore() {
    return runtime.restore();
  }

  async function importTheme(packagePath, settings = {}) {
    const inspected = inspectPackage(packagePath);
    const imported = await importPackage(packagePath, store.userThemesRoot, { overwrite: settings.overwrite === true });
    return { ...imported, inspected };
  }

  function exportTheme(id, outputPath) {
    const theme = store.getTheme(validateThemeId(id));
    return exportPackage(theme.dir, outputPath);
  }

  function deleteTheme(id) {
    return store.deleteUserTheme(validateThemeId(id));
  }

  function resolveThemeAsset(id) {
    const theme = store.getTheme(validateThemeId(id));
    const imagePath = path.resolve(theme.imagePath);
    if (!imagePath.startsWith(`${path.resolve(theme.dir)}${path.sep}`) || !fs.existsSync(imagePath)) throw new Error('主题预览资源不安全');
    return imagePath;
  }

  async function designTheme(payload) {
    const safePayload = validateDesignPayload(payload);
    const custom = require('./custom-theme.cjs');
    return custom.createCustomTheme({ ...safePayload, userThemesRoot: store.userThemesRoot });
  }

  return { status, applyTheme, restore, importTheme, exportTheme, deleteTheme, resolveThemeAsset, designTheme, store, runtime };
}

module.exports = { createService, validateThemeId, validateDesignPayload };
