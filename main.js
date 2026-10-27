const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const safe = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
const pdfDir = () => {
  const d = path.join(app.getPath('userData'), 'pdfs');
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const fileFor = (id) => path.join(pdfDir(), safe(id) + '.pdf');

// Turn normal "share" links into direct-download links, so users can paste anything.
function normalizeUrl(u) {
  u = String(u).trim();
  let m = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || u.match(/drive\.google\.com\/open\?id=([^&#]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3].split('?')[0]}`;
  if (/dropbox\.com/.test(u)) return u.replace(/[?&]dl=0/, '').replace(/(\?|$)/, (x) => (x === '?' ? '?dl=1&' : '?dl=1'));
  return u;
}

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  } catch {
    return fallback;
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#0b1220',
    title: 'QuranBy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  bundled: {
    catalog: readJson('catalog.json', { themes: [], hadith: [] }),
    config: readJson('config.json', {}),
  },
}));

ipcMain.handle('file:list', () =>
  fs.readdirSync(pdfDir()).filter((f) => f.endsWith('.pdf')).map((f) => f.slice(0, -4))
);

ipcMain.handle('file:read', (_e, id) => fs.readFileSync(fileFor(id)));

ipcMain.handle('file:remove', (_e, id) => {
  try { fs.unlinkSync(fileFor(id)); } catch {}
  return true;
});

ipcMain.handle('file:size', async (_e, url) => {
  try {
    const r = await fetch(normalizeUrl(url), { method: 'HEAD', redirect: 'follow' });
    return Number(r.headers.get('content-length')) || 0;
  } catch {
    return 0;
  }
});

ipcMain.handle('file:download', async (e, { id, url }) => {
  const res = await fetch(normalizeUrl(url), { redirect: 'follow' });
  if (!res.ok) throw new Error('Server answered HTTP ' + res.status);
  const total = Number(res.headers.get('content-length')) || 0;
  const tmp = fileFor(id) + '.part';
  let got = 0;
  let last = 0;
  const stream = Readable.fromWeb(res.body);
  stream.on('data', (c) => {
    got += c.length;
    const now = Date.now();
    if (now - last > 120) {
      last = now;
      e.sender.send('download:progress', { id, got, total });
    }
  });
  await pipeline(stream, fs.createWriteStream(tmp));
  const fd = fs.openSync(tmp, 'r');
  const head = Buffer.alloc(5);
  fs.readSync(fd, head, 0, 5, 0);
  fs.closeSync(fd);
  if (head.toString() !== '%PDF-') {
    fs.unlinkSync(tmp);
    throw new Error('That link is not a direct PDF file. Use a link that ends in .pdf (or a Google Drive / GitHub share link).');
  }
  fs.renameSync(tmp, fileFor(id));
  return { size: fs.statSync(fileFor(id)).size };
});

ipcMain.handle('file:pick', async (_e, id) => {
  const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  fs.copyFileSync(r.filePaths[0], fileFor(id));
  return { name: path.basename(r.filePaths[0]).replace(/\.pdf$/i, '') };
});

ipcMain.handle('open:external', (_e, url) => shell.openExternal(url));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
