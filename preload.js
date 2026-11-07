const { contextBridge, ipcRenderer } = require('electron');
const LINKS = require('./links.js');

// Screenshot / self-test launches must not be blocked by the first-run wizard.
const selfCheck = Boolean(
  process.env.COINRAIN_SHOT || process.env.COINRAIN_SHOT_FULL ||
  process.env.COINRAIN_SHOT_IMMERSIVE || process.env.COINRAIN_SHOT_PANEL ||
  process.env.COINRAIN_SHOT_LOCALE || process.env.COINRAIN_SELFTEST
);

contextBridge.exposeInMainWorld('coinRain', {
  isElectron: true,
  selfCheck: selfCheck,
  load: () => ipcRenderer.invoke('cfg:load'),
  save: (data) => ipcRenderer.invoke('cfg:save', data),
  resize: (width, height) => ipcRenderer.send('win:resize', width, height),
  setAlwaysOnTop: (value) => ipcRenderer.send('win:alwaysOnTop', value),
  setKeepAwake: (value) => ipcRenderer.send('win:keepAwake', value),
  minimize: () => ipcRenderer.send('win:minimize'),
  hide: () => ipcRenderer.send('win:hide'),
  close: () => ipcRenderer.send('win:close'),
  setLocale: (lang) => ipcRenderer.send('app:setLocale', lang),
  // Renderer only ever passes a key; the URL itself is resolved in the main process.
  links: Object.assign({}, LINKS.LINKS),
  openLink: (key) => ipcRenderer.send('app:openLink', String(key || '')),
  copyLink: (key) => ipcRenderer.invoke('app:copyLink', String(key || '')),
  onSync: (callback) => {
    ipcRenderer.on('cfg:sync', (_event, data) => callback(data));
  }
});
