'use strict';
const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// A standard origin is needed for persistent localStorage in Chromium.
protocol.registerSchemesAsPrivileged([
  { scheme: 'nails', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);
app.setName('Три гвоздя');
const applicationDir = path.resolve(__dirname, '..');
let backupPath;
let writes = Promise.resolve();

function backupFile() {
  if (!backupPath) {
    const dir = path.join(app.getPath('documents'), 'Три гвоздя');
    fs.mkdirSync(dir, { recursive: true });
    backupPath = path.join(dir, '3-gvozdya-data.json');
  }
  return backupPath;
}
function validData(obj) {
  return obj && obj.app === 'tri-gvozdya' && obj.version === 1 &&
    Array.isArray(obj.tasks) && obj.secrets && typeof obj.secrets === 'object' &&
    !Array.isArray(obj.secrets) && JSON.stringify(obj).length < 12 * 1024 * 1024;
}
function loadBackup() {
  try {
    const obj = JSON.parse(fs.readFileSync(backupFile(), 'utf8'));
    return validData(obj) ? obj : null;
  } catch { return null; }
}
async function saveBackup(obj) {
  if (!validData(obj)) throw new Error('Некорректные данные для сохранения');
  const file = backupFile();
  const temporary = file + '.new';
  fs.writeFileSync(temporary, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(temporary, file);
  return { ok: true, file };
}

ipcMain.on('nails:load', event => { event.returnValue = loadBackup(); });
ipcMain.handle('nails:save', (_event, obj) => {
  // Serialize writes to prevent an older task state from replacing a new one.
  writes = writes.catch(() => {}).then(() => saveBackup(obj));
  return writes;
});
ipcMain.handle('nails:where', () => ({
  program: process.execPath,
  data: backupFile()
}));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 780, minHeight: 520,
    title: 'Три гвоздя — Прибей хаос к плану',
    icon: path.join(applicationDir, 'icons', 'desktop.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({url}) => {
    // External links open in the normal browser, not the privileged app window.
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('nails://planner/')) {
      event.preventDefault();
      if (url.startsWith('https://')) shell.openExternal(url);
    }
  });
  win.loadURL('nails://planner/index.html');
}

app.whenReady().then(() => {
  protocol.handle('nails', request => {
    const uri = new URL(request.url);
    if (uri.hostname !== 'planner') return new Response('Not found', {status: 404});
    let rel;
    try { rel = decodeURIComponent(uri.pathname).replace(/^\/+/, '') || 'index.html'; }
    catch { return new Response('Bad path', {status: 400}); }
    const target = path.resolve(applicationDir, rel);
    if (!target.startsWith(applicationDir + path.sep)) return new Response('Forbidden', {status: 403});
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory())
      return new Response('Not found', {status: 404});
    return net.fetch(pathToFileURL(target).toString());
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
