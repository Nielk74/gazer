import { app, BrowserWindow, nativeImage, shell } from "electron";
import { join } from "node:path";

const isDev = !app.isPackaged;

function createWindow() {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), "assets", "icon.png"));
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "Gazer",
    backgroundColor: "#fafafa",
    icon,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#ffffff",
      symbolColor: "#111111",
      height: 40
    },
    webPreferences: {
      preload: join(app.getAppPath(), "dist-electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    window.loadURL("http://127.0.0.1:5173");
  } else {
    window.loadFile(join(app.getAppPath(), "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.gazer.desktop");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
