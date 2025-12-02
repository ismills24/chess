import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import * as fs from "fs/promises";
import {
  AssetCategory,
  listAssets,
  listAllAssets,
  readAsset,
  readJsonAsset,
  writeAsset,
  writeJsonAsset,
  deleteAsset,
  assetExists,
  getAssetUrl,
} from "./assetManager";

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("maps:save", async (_evt, json: string) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePath, canceled } = await dialog.showSaveDialog(win!, {
    title: "Save Map JSON",
    filters: [{ name: "Map JSON", extensions: ["json"] }],
    defaultPath: "map.json",
  });
  if (canceled || !filePath) return false;
  await fs.writeFile(filePath, json, "utf-8");
  return true;
});

ipcMain.handle("maps:open", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
    title: "Open Map JSON",
    filters: [{ name: "Map JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) return null;
  const content = await fs.readFile(filePaths[0], "utf-8");
  return content;
});

ipcMain.handle("assets:list", async (_evt, category: AssetCategory) => {
  return listAssets(category);
});

ipcMain.handle("assets:listAll", async () => {
  return listAllAssets();
});

ipcMain.handle(
  "assets:read",
  async (_evt, category: AssetCategory, filename: string) => {
    const buffer = await readAsset(category, filename);
    return new Uint8Array(buffer);
  }
);

ipcMain.handle(
  "assets:readJson",
  async (_evt, category: AssetCategory, filename: string) => {
    return readJsonAsset(category, filename);
  }
);

ipcMain.handle(
  "assets:write",
  async (_evt, category: AssetCategory, filename: string, data: Uint8Array) => {
    return writeAsset(category, filename, Buffer.from(data));
  }
);

ipcMain.handle(
  "assets:writeJson",
  async (_evt, category: AssetCategory, filename: string, data: unknown) => {
    return writeJsonAsset(category, filename, data);
  }
);

ipcMain.handle(
  "assets:delete",
  async (_evt, category: AssetCategory, filename: string) => {
    await deleteAsset(category, filename);
    return true;
  }
);

ipcMain.handle(
  "assets:exists",
  async (_evt, category: AssetCategory, filename: string) => {
    return assetExists(category, filename);
  }
);

ipcMain.handle(
  "assets:getUrl",
  (_evt, category: AssetCategory, filename: string) => {
    return getAssetUrl(category, filename);
  }
);
