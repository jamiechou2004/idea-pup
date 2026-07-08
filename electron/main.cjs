const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

const COMPACT_SIZE = { width: 132, height: 122 };
const EXPANDED_SIZE = { width: 380, height: 520 };
let petWindow;

function withDesktopMode(url) {
  const marker = url.includes("?") ? "&desktop=1" : "?desktop=1";
  return `${url}${marker}`;
}

function clampToWorkArea(bounds) {
  const area = screen.getDisplayMatching(bounds).workArea;
  return {
    x: Math.min(Math.max(bounds.x, area.x), area.x + area.width - bounds.width),
    y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - bounds.height),
    width: bounds.width,
    height: bounds.height,
  };
}

function resizePetWindow(win, size) {
  const current = win.getBounds();
  win.setBounds(clampToWorkArea({ ...current, ...size }));
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const startBounds = clampToWorkArea({
    width: COMPACT_SIZE.width,
    height: COMPACT_SIZE.height,
    x: workArea.x + workArea.width - COMPACT_SIZE.width - 28,
    y: workArea.y + workArea.height - COMPACT_SIZE.height - 48,
  });

  petWindow = new BrowserWindow({
    ...startBounds,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.setAlwaysOnTop(true, "floating");
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`Mochi failed to load ${url}: ${code} ${description}`);
  });
  petWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`Mochi renderer stopped: ${details.reason}`);
  });
  petWindow.on("closed", () => {
    petWindow = null;
  });

  const devUrl = process.env.ELECTRON_START_URL;
  const prodUrl = `file://${path.join(__dirname, "../dist/index.html")}`;
  petWindow.loadURL(withDesktopMode(devUrl || prodUrl));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("mochi:get-window-bounds", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.getBounds();
});

ipcMain.on("mochi:move-window", (event, point) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const bounds = win.getBounds();
  win.setPosition(Math.round(point.x), Math.round(point.y));
  win.setBounds(clampToWorkArea({ ...bounds, x: Math.round(point.x), y: Math.round(point.y) }));
});

ipcMain.on("mochi:set-expanded", (event, expanded) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  resizePetWindow(win, expanded ? EXPANDED_SIZE : COMPACT_SIZE);
});

ipcMain.on("mochi:quit", () => {
  app.quit();
});
