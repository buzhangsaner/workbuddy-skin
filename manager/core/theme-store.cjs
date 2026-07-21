const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { validateManifest } = require('./theme-package.cjs');

function defaultStateRoot({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  if (platform === 'win32') {
    return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'WorkBuddySkinManager');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'WorkBuddySkinManager');
  }
  return path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'WorkBuddySkinManager');
}

function safeId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('主题 id 不合法');
  return id;
}

function createThemeStore(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..', '..'));
  const themesRoot = path.join(projectRoot, 'themes');
  const catalogPath = path.join(themesRoot, 'catalog.json');
  const stateRoot = path.resolve(options.stateRoot || defaultStateRoot());
  const userThemesRoot = path.resolve(options.userThemesRoot || path.join(stateRoot, 'themes'));
  fs.mkdirSync(userThemesRoot, { recursive: true });

  function readTheme(directory, source, description = '') {
    try {
      const manifestPath = path.join(directory, 'theme.json');
      const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
      const imagePath = path.resolve(directory, manifest.image);
      const rootPrefix = `${path.resolve(directory)}${path.sep}`;
      if (!imagePath.startsWith(rootPrefix)) throw new Error('主题图片越出主题目录');
      const imageStat = fs.lstatSync(imagePath);
      if (!imageStat.isFile() || imageStat.isSymbolicLink()) throw new Error('主题图片无效');
      return { ...manifest, description: String(description || '').slice(0, 160), source, builtin: source === 'builtin', dir: directory, imagePath };
    } catch {
      return null;
    }
  }

  function allRecords() {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    if (!Array.isArray(catalog) || !catalog.length) throw new Error('内置主题目录无效');
    const records = [];
    const ids = new Set();
    for (const item of catalog) {
      const id = safeId(item?.id);
      if (ids.has(id)) throw new Error(`内置主题 id 重复：${id}`);
      const record = readTheme(path.join(themesRoot, id), 'builtin', item.description);
      if (!record || record.id !== id) throw new Error(`内置主题损坏：${id}`);
      ids.add(id);
      records.push(record);
    }
    const userEntries = fs.readdirSync(userThemesRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    for (const entry of userEntries) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || ids.has(entry.name)) continue;
      const record = readTheme(path.join(userThemesRoot, entry.name), 'user');
      if (!record || record.id !== entry.name || ids.has(record.id)) continue;
      ids.add(record.id);
      records.push(record);
    }
    return records;
  }

  function toSafeRecord(record, activeId) {
    return {
      id: record.id,
      name: record.name,
      tagline: record.tagline,
      quote: record.quote,
      description: record.description,
      colors: { ...record.colors },
      imagePath: record.imagePath,
      source: record.source,
      builtin: record.builtin,
      active: record.id === activeId,
    };
  }

  function listThemes({ activeId = '' } = {}) {
    return allRecords().map(record => toSafeRecord(record, activeId));
  }

  function getTheme(id) {
    const safe = safeId(id);
    const record = allRecords().find(item => item.id === safe);
    if (!record) throw new Error(`主题不存在：${safe}`);
    return record;
  }

  function deleteUserTheme(id) {
    const record = getTheme(id);
    if (record.builtin) throw new Error('内置主题不能删除');
    const destination = path.resolve(record.dir);
    if (!destination.startsWith(`${userThemesRoot}${path.sep}`)) throw new Error('用户主题路径不安全');
    fs.rmSync(destination, { recursive: true, force: true });
    return { ok: true, deleted: true, id: record.id };
  }

  return {
    projectRoot,
    themesRoot,
    stateRoot,
    userThemesRoot,
    listThemes,
    getTheme,
    deleteUserTheme,
  };
}

module.exports = { createThemeStore, defaultStateRoot };
