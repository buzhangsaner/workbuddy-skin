const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  status: () => ipcRenderer.invoke('manager:status'),
  applyTheme: (id, options) => ipcRenderer.invoke('manager:apply', id, options),
  restore: () => ipcRenderer.invoke('manager:restore'),
  importTheme: () => ipcRenderer.invoke('manager:import'),
  exportTheme: id => ipcRenderer.invoke('manager:export', id),
  chooseWallpaper: () => ipcRenderer.invoke('manager:choose-wallpaper'),
  designTheme: payload => ipcRenderer.invoke('manager:design', payload),
  deleteTheme: id => ipcRenderer.invoke('manager:delete', id),
  revealFile: filePath => ipcRenderer.invoke('manager:reveal', filePath),
  openGitHub: () => ipcRenderer.invoke('manager:github'),
});

contextBridge.exposeInMainWorld('workbuddySkinAPI', api);
