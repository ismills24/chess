import type { AssetCategory, AssetInfo, AssetManifest } from "../../asset-manager/types";

export { };

declare global {
    interface Window {
        maps: {
            saveJSON(data: unknown): Promise<boolean>;
            openJSON<T = any>(): Promise<T | null>;
        };
        assets: {
            list(category: AssetCategory): Promise<AssetInfo[]>;
            listAll(): Promise<AssetManifest>;
            read(category: AssetCategory, fileName: string): Promise<string | null>;
            readJSON<T = unknown>(category: AssetCategory, fileName: string): Promise<T | null>;
            getPath(category: AssetCategory, fileName: string): Promise<string | null>;
            getBasePath(): Promise<string>;
        };
    }
}
