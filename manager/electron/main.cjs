const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createService } = require('../core/service.cjs');

const GITHUB_URL = 'https://github.com/buzhangsaner/workbuddy-skin';

protocol.registerSchemesAsPrivileged([{
  scheme: 'theme-asset',
  privileges: { standard: true, secure: true, stream: true },
}]);

function resolveProjectRoot() {
  if (process.resourcesPath && process.versions?.electron) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked');
    const candidate = path.join(unpacked, 'themes');
    if (require('node:fs').existsSync(candidate)) return unpacked;
  }
  return path.resolve(__dirname, '..', '..');
}

const service = createService({ projectRoot: resolveProjectRoot() });
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 680,
    title: 'WorkBuddy Skin Manager',
    backgroundColor: '#eee9df',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function registerProtocol() {
  protocol.handle('theme-asset', request => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'local') throw new Error('Unsupported asset host');
      const id = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      return net.fetch(pathToFileURL(service.resolveThemeAsset(id)).toString());
    } catch (error) {
      return new Response(`Theme asset unavailable: ${error.message}`, { status: 404, headers: { 'content-type': 'text/plain' } });
    }
  });
}

function registerIpc() {
  ipcMain.handle('manager:status', () => service.status());
  ipcMain.handle('manager:apply', (_event, id, options) => service.applyTheme(id, options));
  ipcMain.handle('manager:restore', () => service.restore());
  ipcMain.handle('manager:import', async () => {
    const warning = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '导入安全主题包',
      message: '只导入声明式 WorkBuddy 主题包',
      detail: '管理器会拒绝 JavaScript、HTML、SVG、远程地址和越界路径。',
      buttons: ['选择 .wbskin', '取消'],
      defaultId: 0,
      cancelId: 1,
    });
    if (warning.response !== 0) return { canceled: true };
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: '导入 WorkBuddy 主题',
      properties: ['openFile'],
      filters: [{ name: 'WorkBuddy 主题包', extensions: ['wbskin', 'zip'] }],
    });
    if (picked.canceled || !picked.filePaths?.[0]) return { canceled: true };
    return service.importTheme(picked.filePaths[0]);
  });
  ipcMain.handle('manager:export', async (_event, id) => {
    const picked = await dialog.showSaveDialog(mainWindow, {
      title: '导出 WorkBuddy 主题',
      defaultPath: `${id}.wbskin`,
      filters: [{ name: 'WorkBuddy 主题包', extensions: ['wbskin'] }],
    });
    if (picked.canceled || !picked.filePath) return { canceled: true };
    return service.exportTheme(id, picked.filePath);
  });
  ipcMain.handle('manager:choose-wallpaper', async () => {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: '选择主题背景',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    return picked.canceled || !picked.filePaths?.[0]
      ? { canceled: true }
      : { path: picked.filePaths[0], name: path.basename(picked.filePaths[0]), previewUrl: pathToFileURL(picked.filePaths[0]).toString() };
  });
  ipcMain.handle('manager:design', (_event, payload) => service.designTheme(payload));
  ipcMain.handle('manager:delete', async (_event, id) => {
    const answer = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '删除用户主题',
      message: `确定删除主题“${String(id).slice(0, 64)}”吗？`,
      buttons: ['删除', '取消'],
      defaultId: 1,
      cancelId: 1,
    });
    return answer.response === 0 ? service.deleteTheme(id) : { canceled: true };
  });
  ipcMain.handle('manager:reveal', (_event, filePath) => {
    if (typeof filePath === 'string' && filePath.length <= 4096) shell.showItemInFolder(filePath);
    return { ok: true };
  });
  ipcMain.handle('manager:github', async () => { await shell.openExternal(GITHUB_URL); return { ok: true }; });
}

app.whenReady().then(() => {
  registerProtocol();
  registerIpc();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
