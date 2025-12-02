import type { AssetCategory, AssetEntry, AssetListResult } from "../../shared/assetTypes";

export { };

declare global {
    interface Window {
        maps: {
            saveJSON(data: unknown): Promise<boolean>;
            openJSON<T = unknown>(): Promise<T | null>;
        };
        assets: {
            list(category: AssetCategory): Promise<AssetListResult>;
            listAll(): Promise<Record<AssetCategory, AssetEntry[]>>;
            read(category: AssetCategory, filename: string): Promise<Uint8Array>;
            readJson<T = unknown>(category: AssetCategory, filename: string): Promise<T>;
            write(category: AssetCategory, filename: string, data: Uint8Array): Promise<string>;
            writeJson(category: AssetCategory, filename: string, data: unknown): Promise<string>;
            delete(category: AssetCategory, filename: string): Promise<boolean>;
            exists(category: AssetCategory, filename: string): Promise<boolean>;
            getUrl(category: AssetCategory, filename: string): Promise<string>;
        };
    }
}
