const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');

const FORMAT = 'workbuddy-skin';
const FORMAT_VERSION = 1;
const MAX_ENTRY_COUNT = 8;
const MAX_ARCHIVE_BYTES = 18 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const IMAGE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}\.(?:png|jpe?g|webp)$/i;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function fail(message) {
  const error = new Error(message);
  error.code = 'UNSAFE_THEME_PACKAGE';
  throw error;
}

function normalizeEntryName(name) {
  const raw = String(name || '').replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || /^[a-z]:\//i.test(raw)) fail(`不安全的包路径：${name}`);
  const parts = raw.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    if (parts.some(part => part === '..')) fail(`不安全的路径穿越：${name}`);
  }
  const normalized = parts.filter(part => part && part !== '.').join('/');
  if (!normalized || normalized.startsWith('../') || normalized.includes('/../')) fail(`不安全的包路径：${name}`);
  return normalized;
}

function isSymlink(entry) {
  const mode = (Number(entry.attr || 0) >>> 16) & 0xf000;
  return mode === 0xa000;
}

function cleanText(value, field, max) {
  if (typeof value !== 'string') fail(`${field} 必须是文本`);
  const text = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!text || text.length > max) fail(`${field} 长度不合法`);
  return text;
}

function validateManifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('theme.json 无效');
  if (input.schemaVersion !== 1) fail('theme.json schemaVersion 不支持');
  if (typeof input.id !== 'string' || !ID_PATTERN.test(input.id)) fail('theme id 不合法');
  if (typeof input.image !== 'string' || !IMAGE_PATTERN.test(input.image)) fail('主题图片路径不合法');
  const colors = input.colors;
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) fail('主题 colors 无效');
  const safeColors = {};
  for (const key of ['accent', 'secondary', 'surface', 'ink']) {
    if (typeof colors[key] !== 'string' || !COLOR_PATTERN.test(colors[key])) fail(`主题颜色 ${key} 不合法`);
    safeColors[key] = colors[key].toLowerCase();
  }
  return {
    schemaVersion: 1,
    id: input.id,
    name: cleanText(input.name, '主题名称', 80),
    tagline: cleanText(input.tagline, '主题标题', 120),
    quote: cleanText(input.quote, '主题眉题', 120),
    image: input.image,
    colors: safeColors,
  };
}

function readPackage(packagePath) {
  if (!packagePath || !fs.existsSync(packagePath)) fail('找不到主题包');
  const archiveStat = fs.statSync(packagePath);
  if (!archiveStat.isFile() || archiveStat.size > MAX_ARCHIVE_BYTES) fail('主题包大小超过限制');
  const zip = new AdmZip(packagePath);
  const entries = zip.getEntries().filter(entry => !entry.isDirectory);
  if (!entries.length || entries.length > MAX_ENTRY_COUNT) fail('主题包文件数量超过限制');

  const map = new Map();
  let total = 0;
  for (const entry of entries) {
    if (isSymlink(entry)) fail(`主题包不允许符号链接：${entry.entryName}`);
    const normalized = normalizeEntryName(entry.entryName);
    if (map.has(normalized)) fail(`主题包包含重复路径：${normalized}`);
    const size = Number(entry.header?.size || 0);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_ARCHIVE_BYTES) fail('主题包文件大小超过限制');
    total += size;
    if (total > MAX_TOTAL_BYTES) fail('主题包解压大小超过限制');
    map.set(normalized, entry);
  }

  const metaEntry = map.get('package.json');
  const manifestEntry = map.get('theme/theme.json');
  if (!metaEntry || !manifestEntry) fail('主题包缺少 package.json 或 theme/theme.json');
  let meta;
  let manifest;
  try {
    meta = JSON.parse(metaEntry.getData().toString('utf8'));
    manifest = validateManifest(JSON.parse(manifestEntry.getData().toString('utf8')));
  } catch (error) {
    if (error?.code === 'UNSAFE_THEME_PACKAGE') throw error;
    fail('主题包 JSON 无效');
  }
  if (meta?.format !== FORMAT || meta?.version !== FORMAT_VERSION) fail('主题包格式不支持');

  const imagePath = `theme/${manifest.image}`;
  const allowed = new Set(['package.json', 'theme/theme.json', imagePath]);
  for (const entryPath of map.keys()) {
    if (!allowed.has(entryPath)) fail(`主题包不允许文件：${entryPath}`);
  }
  const imageEntry = map.get(imagePath);
  if (!imageEntry) fail('主题包缺少主题图片');
  const imageData = imageEntry.getData();
  if (!imageData.length || imageData.length > MAX_ARCHIVE_BYTES) fail('主题图片大小不合法');

  return { meta, manifest, imageData, entries: map };
}

function inspectPackage(packagePath) {
  const parsed = readPackage(packagePath);
  return {
    ok: true,
    format: FORMAT,
    version: FORMAT_VERSION,
    id: parsed.manifest.id,
    name: parsed.manifest.name,
    image: parsed.manifest.image,
    fileCount: parsed.entries.size,
    imageBytes: parsed.imageData.length,
    sha256: crypto.createHash('sha256').update(parsed.imageData).digest('hex'),
    hasExecutableContent: false,
  };
}

function exportPackage(themeDir, outputPath) {
  const root = path.resolve(themeDir || '');
  const manifestPath = path.join(root, 'theme.json');
  if (!fs.existsSync(manifestPath)) fail('主题目录缺少 theme.json');
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  const imagePath = path.resolve(root, manifest.image);
  if (!imagePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(imagePath)) fail('主题图片路径不安全或不存在');
  const stat = fs.lstatSync(imagePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_ARCHIVE_BYTES) fail('主题图片无效或超过大小限制');
  const output = /\.(?:wbskin|zip)$/i.test(outputPath) ? outputPath : `${outputPath}.wbskin`;
  const zip = new AdmZip();
  zip.addFile('package.json', Buffer.from(`${JSON.stringify({
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    themeId: manifest.id,
  }, null, 2)}\n`));
  zip.addFile('theme/theme.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  zip.addFile(`theme/${manifest.image}`, fs.readFileSync(imagePath));
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  zip.writeZip(output);
  return { ok: true, id: manifest.id, name: manifest.name, path: path.resolve(output) };
}

async function importPackage(packagePath, userThemesRoot, options = {}) {
  const parsed = readPackage(packagePath);
  const root = path.resolve(userThemesRoot || '');
  await fsp.mkdir(root, { recursive: true });
  const destination = path.join(root, parsed.manifest.id);
  if (fs.existsSync(destination) && !options.overwrite) fail(`主题 ${parsed.manifest.id} 已存在`);
  const temporary = path.join(root, `.import-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    await fsp.mkdir(temporary, { recursive: false });
    await fsp.writeFile(path.join(temporary, 'theme.json'), `${JSON.stringify(parsed.manifest, null, 2)}\n`, { flag: 'wx' });
    await fsp.writeFile(path.join(temporary, parsed.manifest.image), parsed.imageData, { flag: 'wx' });
    if (fs.existsSync(destination)) await fsp.rm(destination, { recursive: true, force: true });
    await fsp.rename(temporary, destination);
    return { ok: true, id: parsed.manifest.id, name: parsed.manifest.name, dir: destination };
  } catch (error) {
    await fsp.rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

module.exports = {
  FORMAT,
  FORMAT_VERSION,
  MAX_ENTRY_COUNT,
  MAX_ARCHIVE_BYTES,
  MAX_TOTAL_BYTES,
  validateManifest,
  inspectPackage,
  exportPackage,
  importPackage,
};
