const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const L = require('./renderer/locale.js');

let win = null;
let tray = null;
let awakeId = null;
let boundsTimer = null;
let uiLang = 'en-US';

const MINI = { width: 260, height: 210 };
const FULL = { width: 330, height: 560 };

if (process.env.COINRAIN_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.COINRAIN_USER_DATA));
} else {
  // Keep a stable config folder regardless of productName / branding changes.
  // Otherwise renaming the app would silently orphan the accumulated total.
  const current = app.getPath('userData');
  if (path.basename(current).toLowerCase() !== 'coin-rain') {
    app.setPath('userData', path.join(app.getPath('appData'), 'coin-rain'));
  }
}

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeConfig(data) {
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(data || {}, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

function patchConfig(data) {
  return writeConfig(Object.assign({}, readConfig(), data || {}));
}

function setKeepAwake(enabled) {
  if (enabled && awakeId === null) {
    try {
      awakeId = powerSaveBlocker.start('prevent-display-sleep');
    } catch (_) {
      awakeId = null;
    }
  } else if (!enabled && awakeId !== null) {
    try {
      powerSaveBlocker.stop(awakeId);
    } catch (_) {
      // already released
    }
    awakeId = null;
  }
}

function saveBounds() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    patchConfig({ bounds: win.getBounds() });
  }, 350);
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'build', 'icon.png');
    if (!fs.existsSync(iconPath)) return;
    const image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) return;
    if (tray) {
      try { tray.destroy(); } catch (_) { /* already gone */ }
      tray = null;
    }
    tray = new Tray(image.resize({ width: 16, height: 16 }));
    tray.setToolTip(L.t(uiLang, 'tray.tooltip'));
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: L.t(uiLang, 'tray.show'),
        click: () => {
          if (!win) return;
          if (win.isVisible()) win.hide();
          else { win.show(); win.focus(); }
        }
      },
      {
        label: L.t(uiLang, 'tray.top'),
        type: 'checkbox',
        checked: win ? win.isAlwaysOnTop() : true,
        click: (item) => {
          if (!win) return;
          win.setAlwaysOnTop(item.checked);
          patchConfig({ alwaysOnTop: item.checked });
          win.webContents.send('cfg:sync', { alwaysOnTop: item.checked });
        }
      },
      {
        label: L.t(uiLang, 'tray.auto'),
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked })
      },
      { type: 'separator' },
      {
        label: L.t(uiLang, 'tray.quit'),
        click: () => {
          if (win) win.close();
          app.quit();
        }
      }
    ]));
    tray.on('click', () => {
      if (!win) return;
      if (win.isVisible()) win.focus();
      else win.show();
    });
  } catch (err) {
    console.warn('tray unavailable:', err.message);
  }
}

function captureShot(target, output) {
  target.capturePage().then((image) => {
    try {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, image.toPNG());
      console.log('COINRAIN_SHOT saved: ' + output);
    } catch (err) {
      console.warn('COINRAIN_SHOT write failed:', err.message);
    }
  }).catch((err) => console.warn('COINRAIN_SHOT capture failed:', err.message));
}

function createWindow() {
  const saved = readConfig();
  uiLang = L.normalizeLang(saved.lang || 'en-US');
  const bounds = saved.bounds || {};
  const area = screen.getPrimaryDisplay().workArea;
  // 每次启动都回到默认挂机小窗尺寸，只保留上次的位置
  const width = MINI.width;
  const height = MINI.height;
  const fallbackX = area.x + area.width - width - 32;
  const fallbackY = area.y + 40;
  const x = Math.max(area.x, Math.min(Number.isFinite(bounds.x) ? bounds.x : fallbackX, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(Number.isFinite(bounds.y) ? bounds.y : fallbackY, area.y + area.height - height));

  win = new BrowserWindow({
    x, y, width, height,
    minWidth: 220,
    minHeight: MINI.height,
    maxHeight: 800,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: saved.alwaysOnTop !== false,
    skipTaskbar: false,
    title: 'Coin-Rain',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const shot = process.env.COINRAIN_SHOT;
  const shotFull = process.env.COINRAIN_SHOT_FULL;
  const shotImmersive = process.env.COINRAIN_SHOT_IMMERSIVE;
  const shotPanel = process.env.COINRAIN_SHOT_PANEL;
  const shotDelay = Number(process.env.COINRAIN_SHOT_DELAY) || 1500;
  const fullDelay = Number(process.env.COINRAIN_SHOT_FULL_DELAY) || 800;
  // Self-check helper: switch language/currency before the screenshot is taken.
  const shotLocale = process.env.COINRAIN_SHOT_LOCALE || '';
  const shotScroll = process.env.COINRAIN_SHOT_SCROLL || '';
  if (shotLocale) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        const parts = shotLocale.split(':');
        const lang = JSON.stringify(parts[0] || 'en-US');
        const code = JSON.stringify(parts[1] || 'USD');
        win.webContents.executeJavaScript(
          "if(window.coinRainDebug) window.coinRainDebug.setLocale(" + lang + "," + code + ");" +
          "var bb=document.getElementById('bubble'); if(bb) bb.classList.remove('show');"
        ).catch((err) => console.warn('locale switch failed:', err.message));
        if (process.env.COINRAIN_SHOT_DUMP) {
          setTimeout(() => {
            win.webContents.executeJavaScript(
              'JSON.stringify(window.coinRainDebug.getLocale())'
            ).then((s) => console.log('COINRAIN_LOCALE_STATE: ' + s)).catch(() => {});
          }, 120);
        }
      }, Math.max(150, shotDelay - 450));
    });
  }
  if (shot || shotFull || shotImmersive || shotPanel) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (shot) captureShot(win, shot);

        const captureImmersive = (done) => {
          if (!shotImmersive) return done();
          win.webContents.executeJavaScript(
            "window.coinRainDebug && window.coinRainDebug.autoIdle(700)"
          ).catch((err) => console.warn('immersive trigger failed:', err.message));
          setTimeout(() => {
            captureShot(win, shotImmersive);
            win.webContents.executeJavaScript(
              "window.coinRainDebug && window.coinRainDebug.wake(false)"
            ).catch(() => {});
            done();
          }, 1600);
        };

        captureImmersive(() => {
          if (!shotFull) return;
          setTimeout(() => {
            win.setSize(330, 560, false);
            win.webContents.executeJavaScript(
              "var b=document.getElementById('btnMore'); if(b) b.click();"
            ).then(() => {
              setTimeout(() => {
                captureShot(win, shotFull);
                if (shotPanel) {
                  const scrollJs = shotScroll === 'locale'
                    ? "var p=document.getElementById('panel'); if(p){var c=document.getElementById('localeCard'); p.scrollTop = c.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop - 8;}"
                    : (shotScroll !== ''
                        ? "var p=document.getElementById('panel'); if(p) p.scrollTop=" + Number(shotScroll) + ";"
                        : "var p=document.getElementById('panel'); if(p) p.scrollTop=p.scrollHeight;");
                  win.webContents.executeJavaScript(scrollJs).catch(() => {});
                  setTimeout(() => captureShot(win, shotPanel), 550);
                }
              }, fullDelay);
            }).catch((err) => console.warn('expand failed:', err.message));
          }, 500);
        });
      }, shotDelay);
    });
  }

  win.on('move', saveBounds);
  win.on('resize', saveBounds);
  win.on('closed', () => { win = null; });

  if (saved.keepAwake) setKeepAwake(true);
  createTray();
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  ipcMain.handle('cfg:load', () => readConfig());
  ipcMain.handle('cfg:save', (_event, data) => patchConfig(data));
  ipcMain.on('win:resize', (_event, width, height) => {
    if (!win || win.isDestroyed()) return;
    const w = Math.max(220, Math.min(420, Math.round(width)));
    const h = Math.max(MINI.height, Math.min(800, Math.round(height)));
    win.setSize(w, h, true);
  });
  ipcMain.on('win:alwaysOnTop', (_event, value) => {
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(!!value);
  });
  ipcMain.on('win:keepAwake', (_event, value) => setKeepAwake(!!value));
  ipcMain.on('win:minimize', () => { if (win) win.minimize(); });
  ipcMain.on('win:hide', () => { if (win) win.hide(); });
  ipcMain.on('win:close', () => { if (win) win.close(); });
  ipcMain.on('app:setLocale', (_event, lang) => {
    const next = L.normalizeLang(lang);
    if (next === uiLang) return;
    uiLang = next;
    createTray();
  });

  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => {
    setKeepAwake(false);
    app.quit();
  });
}

module.exports = { MINI, FULL };
