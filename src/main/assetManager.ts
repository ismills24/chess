import * as fs from "fs/promises";
import * as path from "path";
import { app } from "electron";
import {
  AssetCategory,
  AssetEntry,
  AssetListResult,
  ASSET_EXTENSIONS,
} from "../shared/assetTypes";

export type { AssetCategory, AssetEntry, AssetListResult };

function getAssetsRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "assets");
  }
  return path.join(app.getAppPath(), "assets");
}

function getCategoryPath(category: AssetCategory): string {
  return path.join(getAssetsRoot(), category);
}

function isValidAsset(filename: string, category: AssetCategory): boolean {
  if (filename.startsWith(".")) return false;
  const ext = path.extname(filename).toLowerCase();
  return ASSET_EXTENSIONS[category].includes(ext);
}

export async function listAssets(
  category: AssetCategory
): Promise<AssetListResult> {
  const categoryPath = getCategoryPath(category);
  const assets: AssetEntry[] = [];

  try {
    const entries = await fs.readdir(categoryPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isValidAsset(entry.name, category)) continue;

      const filePath = path.join(categoryPath, entry.name);
      const stat = await fs.stat(filePath);
      const ext = path.extname(entry.name).toLowerCase();
      const name = path.basename(entry.name, ext);

      assets.push({
        name,
        filename: entry.name,
        path: filePath,
        extension: ext,
        category,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
      });
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  return { category, assets };
}

export async function listAllAssets(): Promise<
  Record<AssetCategory, AssetEntry[]>
> {
  const categories: AssetCategory[] = [
    "maps",
    "models",
    "textures",
    "fonts",
    "media",
  ];
  const results = await Promise.all(categories.map(listAssets));

  return results.reduce(
    (acc, result) => {
      acc[result.category] = result.assets;
      return acc;
    },
    {} as Record<AssetCategory, AssetEntry[]>
  );
}

export async function readAsset(
  category: AssetCategory,
  filename: string
): Promise<Buffer> {
  const filePath = path.join(getCategoryPath(category), filename);
  return fs.readFile(filePath);
}

export async function readJsonAsset<T = unknown>(
  category: AssetCategory,
  filename: string
): Promise<T> {
  const buffer = await readAsset(category, filename);
  return JSON.parse(buffer.toString("utf-8"));
}

export async function writeAsset(
  category: AssetCategory,
  filename: string,
  data: Buffer | string
): Promise<string> {
  const categoryPath = getCategoryPath(category);
  await fs.mkdir(categoryPath, { recursive: true });
  const filePath = path.join(categoryPath, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}

export async function writeJsonAsset(
  category: AssetCategory,
  filename: string,
  data: unknown
): Promise<string> {
  const json = JSON.stringify(data, null, 2);
  return writeAsset(category, filename, json);
}

export async function deleteAsset(
  category: AssetCategory,
  filename: string
): Promise<void> {
  const filePath = path.join(getCategoryPath(category), filename);
  await fs.unlink(filePath);
}

export async function assetExists(
  category: AssetCategory,
  filename: string
): Promise<boolean> {
  const filePath = path.join(getCategoryPath(category), filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getAssetUrl(category: AssetCategory, filename: string): string {
  const filePath = path.join(getCategoryPath(category), filename);
  return `file://${filePath}`;
}

export { getAssetsRoot, getCategoryPath };
