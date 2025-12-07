import { app, ipcMain } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { 
    AssetCategory, 
    AssetInfo, 
    AssetManifest, 
    ASSET_EXTENSIONS, 
    ASSET_DIRECTORIES 
} from "../asset-manager/types";

function getAssetsBasePath(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "assets");
    }
    return path.join(app.getAppPath(), "assets");
}

async function getAssetInfo(
    filePath: string, 
    category: AssetCategory
): Promise<AssetInfo | null> {
    try {
        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        if (!ASSET_EXTENSIONS[category].includes(ext)) {
            return null;
        }

        return {
            name: path.basename(filePath, ext),
            path: filePath,
            extension: ext,
            category,
            size: stats.size,
            modifiedAt: stats.mtimeMs,
        };
    } catch {
        return null;
    }
}

async function listAssetsInCategory(category: AssetCategory): Promise<AssetInfo[]> {
    const basePath = getAssetsBasePath();
    const categoryDir = path.join(basePath, ASSET_DIRECTORIES[category].replace("assets/", ""));
    
    try {
        const entries = await fs.readdir(categoryDir, { withFileTypes: true });
        const assets: AssetInfo[] = [];

        for (const entry of entries) {
            if (entry.isFile()) {
                const filePath = path.join(categoryDir, entry.name);
                const asset = await getAssetInfo(filePath, category);
                if (asset) {
                    assets.push(asset);
                }
            }
        }

        return assets.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

async function getAllAssets(): Promise<AssetManifest> {
    const [maps, models, textures, fonts, images, videos] = await Promise.all([
        listAssetsInCategory("maps"),
        listAssetsInCategory("models"),
        listAssetsInCategory("textures"),
        listAssetsInCategory("fonts"),
        listAssetsInCategory("images"),
        listAssetsInCategory("videos"),
    ]);

    return { maps, models, textures, fonts, images, videos };
}

async function readAssetFile(category: AssetCategory, fileName: string): Promise<Buffer | null> {
    const basePath = getAssetsBasePath();
    const categoryDir = path.join(basePath, ASSET_DIRECTORIES[category].replace("assets/", ""));
    const filePath = path.join(categoryDir, fileName);

    try {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(basePath))) {
            throw new Error("Invalid path: attempted directory traversal");
        }

        return await fs.readFile(filePath);
    } catch {
        return null;
    }
}

async function readAssetJSON<T = unknown>(category: AssetCategory, fileName: string): Promise<T | null> {
    const buffer = await readAssetFile(category, fileName);
    if (!buffer) return null;
    
    try {
        return JSON.parse(buffer.toString("utf-8")) as T;
    } catch {
        return null;
    }
}

async function getAssetPath(category: AssetCategory, fileName: string): Promise<string | null> {
    const basePath = getAssetsBasePath();
    const categoryDir = path.join(basePath, ASSET_DIRECTORIES[category].replace("assets/", ""));
    const filePath = path.join(categoryDir, fileName);

    try {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(basePath))) {
            return null;
        }
        
        await fs.access(filePath);
        return filePath;
    } catch {
        return null;
    }
}

export function registerAssetHandlers(): void {
    ipcMain.handle("assets:list", async (_evt, category: AssetCategory) => {
        return listAssetsInCategory(category);
    });

    ipcMain.handle("assets:listAll", async () => {
        return getAllAssets();
    });

    ipcMain.handle("assets:read", async (_evt, category: AssetCategory, fileName: string) => {
        const buffer = await readAssetFile(category, fileName);
        return buffer ? buffer.toString("base64") : null;
    });

    ipcMain.handle("assets:readJSON", async (_evt, category: AssetCategory, fileName: string) => {
        return readAssetJSON(category, fileName);
    });

    ipcMain.handle("assets:getPath", async (_evt, category: AssetCategory, fileName: string) => {
        return getAssetPath(category, fileName);
    });

    ipcMain.handle("assets:getBasePath", async () => {
        return getAssetsBasePath();
    });
}


