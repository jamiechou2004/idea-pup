const { app, BrowserWindow, ipcMain, screen } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const COMPACT_SIZE = { width: 132, height: 122 };
const EXPANDED_SIZE = { width: 380, height: 520 };
let petWindow;

const CODEX_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          line: { type: "string" },
        },
        required: ["title", "line"],
        additionalProperties: false,
      },
    },
    title: { type: "string" },
    line: { type: "string" },
    details: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  additionalProperties: false,
};

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

function findCodexBinary() {
  const candidates = [
    process.env.CODEX_PATH,
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/usr/bin/codex",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "codex";
}

function parseCodexJson(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (!lines[i].startsWith("{")) continue;
      try {
        return JSON.parse(lines[i]);
      } catch {
        // Keep scanning; Codex may print structured logs before the final JSON.
      }
    }
    throw new Error("Codex did not return JSON.");
  }
}

function ensureCodexSchemaFile() {
  const schemaPath = path.join(app.getPath("userData"), "codex-response.schema.json");
  fs.writeFileSync(schemaPath, JSON.stringify(CODEX_RESPONSE_SCHEMA, null, 2));
  return schemaPath;
}

function ensureMochiCodexHome() {
  const codexHome = path.join(app.getPath("userData"), "codex-home");
  fs.mkdirSync(codexHome, { recursive: true });

  const sourceAuth = path.join(app.getPath("home"), ".codex", "auth.json");
  const targetAuth = path.join(codexHome, "auth.json");
  if (!fs.existsSync(sourceAuth)) {
    throw new Error("Codex is not logged in. Run `codex login` first.");
  }

  const shouldCopyAuth = !fs.existsSync(targetAuth)
    || fs.statSync(sourceAuth).mtimeMs > fs.statSync(targetAuth).mtimeMs;
  if (shouldCopyAuth) {
    fs.copyFileSync(sourceAuth, targetAuth);
    fs.chmodSync(targetAuth, 0o600);
  }

  return codexHome;
}

function askCodex(prompt) {
  const codexPath = findCodexBinary();
  const schemaPath = ensureCodexSchemaFile();
  const codexHome = ensureMochiCodexHome();
  const safePrompt = `${prompt}

Use your local reasoning only. Do not inspect local files, edit files, run shell commands, browse the web, or ask follow-up questions. Return only the JSON object requested by the prompt.`;

  return new Promise((resolve, reject) => {
    execFile(
      codexPath,
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--ignore-rules",
        "--color",
        "never",
        "--output-schema",
        schemaPath,
        safePrompt,
      ],
      {
        cwd: app.getPath("home"),
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
        },
        timeout: 120000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(detail));
          return;
        }
        try {
          resolve(parseCodexJson(stdout));
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
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

ipcMain.handle("mochi:ask-codex", async (_event, prompt) => {
  return askCodex(prompt);
});

ipcMain.on("mochi:quit", () => {
  app.quit();
});
