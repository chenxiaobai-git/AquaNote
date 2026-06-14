const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1366,
    minHeight: 768,
    resizable: false,
    maximizable: false,
    minimizable: true,
    closable: true,
    fullscreenable: false,
    frame: false,
    title: 'AquaNote - 水族养护科研级软件',
    backgroundColor: '#0a1628',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'public', 'images', 'logo', 'aquanote-logo.png'),
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers for custom title bar
ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('save-file', async (event, { defaultPath, content }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { canceled: true };
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath,
    filters: [{ name: 'AquaNote 工作区文件', extensions: ['an'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { canceled: false, filePath };
});
