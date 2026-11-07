import { app, BrowserWindow, shell } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MOVE_BY_MOVE_PORT || 4173);
const BASE = "/chess_movebymove/";
const BOARD_NAME_PREFIXES = ["Chessnut", "ChessUp"];

app.setName("Move by Move");
app.commandLine.appendSwitch("enable-experimental-web-platform-features");
app.commandLine.appendSwitch("enable-features", "WebBluetooth,WebHID");

function wwwRoot() {
  const candidates = [
    path.join(process.resourcesPath, "www"),
    path.join(__dirname, "..", "www"),
    path.join(__dirname, "www"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "chess_movebymove", "index.html"))) {
      return candidate;
    }
  }
  return candidates[0];
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".wasm":
      return "application/wasm";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".map":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

function startStaticServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
        let pathname = decodeURIComponent(url.pathname);
        if (pathname.endsWith("/")) pathname += "index.html";
        const filePath = path.normalize(path.join(root, pathname));
        if (!filePath.startsWith(root + path.sep) && filePath !== root) {
          res.writeHead(403).end("Forbidden");
          return;
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404).end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": contentType(filePath) });
          res.end(data);
        });
      } catch {
        res.writeHead(500).end("Error");
      }
    });
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function isBoardDevice(device) {
  const name = device.deviceName || "";
  return BOARD_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function wireBluetooth(win) {
  const ses = win.webContents.session;
  /** @type {Map<string, { deviceId: string, deviceName: string }>} */
  const seen = new Map();
  /** @type {((deviceId: string) => void) | null} */
  let pendingCallback = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let scanTimer = null;

  const finish = (deviceId) => {
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    if (pendingCallback) {
      pendingCallback(deviceId);
      pendingCallback = null;
    }
    seen.clear();
  };

  // Chromium already applied requestDevice filters — pick Chessnut/ChessUp by
  // name when possible, otherwise the first device as soon as one appears.
  // (deviceName is often empty on first discovery events.)
  win.webContents.on("select-bluetooth-device", (event, devices, callback) => {
    event.preventDefault();
    pendingCallback = callback;
    for (const device of devices) {
      seen.set(device.deviceId, device);
    }
    const preferred =
      [...seen.values()].find(isBoardDevice) ??
      (seen.size > 0 ? [...seen.values()][0] : null);
    if (preferred) {
      console.log(
        "[bluetooth] select",
        preferred.deviceName || "(unnamed)",
        preferred.deviceId,
      );
      finish(preferred.deviceId);
      return;
    }
    if (!scanTimer) {
      scanTimer = setTimeout(() => {
        console.log("[bluetooth] scan timeout, devices seen:", seen.size);
        finish("");
      }, 15_000);
    }
  });

  ses.setPermissionCheckHandler((_wc, permission) => {
    return (
      permission === "bluetooth" ||
      permission === "hid" ||
      permission === "clipboard-read" ||
      permission === "media"
    );
  });

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(
      permission === "bluetooth" ||
        permission === "hid" ||
        permission === "clipboard-read" ||
        permission === "media" ||
        permission === "notifications",
    );
  });

  ses.setDevicePermissionHandler((details) => {
    return details.deviceType === "bluetooth" || details.deviceType === "hid";
  });

  if (typeof ses.setBluetoothPairingHandler === "function") {
    ses.setBluetoothPairingHandler((_details, callback) => {
      callback({ confirmed: true });
    });
  }
}

function createWindow() {
  const iconPng = path.join(__dirname, "icon.png");
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: "Move by Move",
    backgroundColor: "#0f1419",
    autoHideMenuBar: true,
    ...(fs.existsSync(iconPng) ? { icon: iconPng } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      experimentalFeatures: true,
    },
  });

  wireBluetooth(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(`http://127.0.0.1:${PORT}${BASE}`);
  return win;
}

/** @type {import('node:http').Server | null} */
let server = null;

app.whenReady().then(async () => {
  const root = wwwRoot();
  if (!fs.existsSync(path.join(root, "chess_movebymove", "index.html"))) {
    console.error("Missing build at", path.join(root, "chess_movebymove"));
    app.quit();
    return;
  }

  try {
    server = await startStaticServer(root);
  } catch (err) {
    // Port already in use — reuse existing local server.
    if (err && typeof err === "object" && "code" in err && err.code !== "EADDRINUSE") {
      console.error(err);
      app.quit();
      return;
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (server) {
    server.close();
    server = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (server) {
    server.close();
    server = null;
  }
});
