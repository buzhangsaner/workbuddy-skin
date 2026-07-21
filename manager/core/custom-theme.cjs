const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateManifest } = require('./theme-package.cjs');

const MAX_WALLPAPER_BYTES = 16 * 1024 * 1024;
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function fail(message) {
  const error = new Error(message);
  error.code = 'INVALID_WALLPAPER';
  throw error;
}

function hasRasterSignature(buffer, extension) {
  if (extension === '.png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === '.jpg' || extension === '.jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === '.webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

async function inspectWallpaper(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath || imagePath.length > 4096) fail('背景图片路径无效');
  const source = path.resolve(imagePath);
  const extension = path.extname(source).toLowerCase();
  if (!EXTENSIONS.has(extension)) fail('背景图片扩展名不支持');
  let stat;
  try { stat = await fsp.lstat(source); } catch { fail('找不到背景图片'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('背景图片不能是目录或符号链接');
  if (stat.size <= 0 || stat.size > MAX_WALLPAPER_BYTES) fail('背景图片大小超过 16 MB 限制');
  const handle = await fsp.open(source, 'r');
  try {
    const signature = Buffer.alloc(16);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    if (!hasRasterSignature(signature.subarray(0, bytesRead), extension)) fail('背景图片格式与扩展名不匹配');
  } finally { await handle.close(); }
  return { source, extension, bytes: stat.size };
}

function nextThemeId(root, now, randomHex) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Math.max(0, Number(now()) || Date.now()).toString(36);
    const entropy = String(randomHex()).toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 12) || crypto.randomBytes(6).toString('hex');
    const id = `custom-${stamp}-${entropy}`;
    if (!fs.existsSync(path.join(root, id))) return id;
  }
  fail('无法创建唯一的自定义主题 id');
}

async function createCustomTheme(options = {}) {
  const wallpaper = await inspectWallpaper(options.imagePath);
  const root = path.resolve(options.userThemesRoot || '');
  if (!root) fail('用户主题目录无效');
  await fsp.mkdir(root, { recursive: true });
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const randomHex = typeof options.randomHex === 'function' ? options.randomHex : () => crypto.randomBytes(6).toString('hex');
  const id = nextThemeId(root, now, randomHex);
  const image = `hero${wallpaper.extension === '.jpeg' ? '.jpg' : wallpaper.extension}`;
  const manifest = validateManifest({
    schemaVersion: 1,
    id,
    name: options.name,
    tagline: options.tagline,
    quote: options.quote,
    image,
    colors: {
      accent: options.accent,
      secondary: options.secondary,
      surface: options.surface,
      ink: options.ink,
    },
    presentation: {
      fit: options.fit || 'cover',
      position: options.position || 'right center',
    },
  });
  const temporary = path.join(root, `.design-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  const destination = path.join(root, id);
  try {
    await fsp.mkdir(temporary, { recursive: false });
    await fsp.copyFile(wallpaper.source, path.join(temporary, image), fs.constants.COPYFILE_EXCL);
    await fsp.writeFile(path.join(temporary, 'theme.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await fsp.rename(temporary, destination);
    return { ok: true, id, name: manifest.name, dir: destination, imagePath: path.join(destination, image), presentation: manifest.presentation };
  } catch (error) {
    await fsp.rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

module.exports = { MAX_WALLPAPER_BYTES, createCustomTheme, inspectWallpaper, hasRasterSignature };
