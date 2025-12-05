import { AssetCategory, AssetInfo, AssetManifest } from "./types";

class AssetManagerInstance {
    private cache: Map<string, AssetInfo[]> = new Map();
    private manifestCache: AssetManifest | null = null;
    private pathCache: Map<string, string> = new Map();

    async list(category: AssetCategory, useCache = true): Promise<AssetInfo[]> {
        if (useCache && this.cache.has(category)) {
            return this.cache.get(category)!;
        }

        const assets = await window.assets.list(category);
        this.cache.set(category, assets);
        return assets;
    }

    async listAll(useCache = true): Promise<AssetManifest> {
        if (useCache && this.manifestCache) {
            return this.manifestCache;
        }

        const manifest = await window.assets.listAll();
        this.manifestCache = manifest;
        
        for (const category of Object.keys(manifest) as AssetCategory[]) {
            this.cache.set(category, manifest[category]);
        }
        
        return manifest;
    }

    async getMaps(): Promise<AssetInfo[]> {
        return this.list("maps");
    }

    async getModels(): Promise<AssetInfo[]> {
        return this.list("models");
    }

    async getTextures(): Promise<AssetInfo[]> {
        return this.list("textures");
    }

    async getFonts(): Promise<AssetInfo[]> {
        return this.list("fonts");
    }

    async getImages(): Promise<AssetInfo[]> {
        return this.list("images");
    }

    async getVideos(): Promise<AssetInfo[]> {
        return this.list("videos");
    }

    async readFile(category: AssetCategory, fileName: string): Promise<ArrayBuffer | null> {
        const base64 = await window.assets.read(category, fileName);
        if (!base64) return null;
        
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async readJSON<T = unknown>(category: AssetCategory, fileName: string): Promise<T | null> {
        return window.assets.readJSON<T>(category, fileName);
    }

    async readMap<T = unknown>(fileName: string): Promise<T | null> {
        const fullName = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
        return this.readJSON<T>("maps", fullName);
    }

    async getFilePath(category: AssetCategory, fileName: string): Promise<string | null> {
        const cacheKey = `${category}:${fileName}`;
        
        if (this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey)!;
        }

        const filePath = await window.assets.getPath(category, fileName);
        if (filePath) {
            this.pathCache.set(cacheKey, filePath);
        }
        return filePath;
    }

    async getModelPath(fileName: string): Promise<string | null> {
        return this.getFilePath("models", fileName);
    }

    async getTexturePath(fileName: string): Promise<string | null> {
        return this.getFilePath("textures", fileName);
    }

    async getFontPath(fileName: string): Promise<string | null> {
        return this.getFilePath("fonts", fileName);
    }

    async getImagePath(fileName: string): Promise<string | null> {
        return this.getFilePath("images", fileName);
    }

    async getVideoPath(fileName: string): Promise<string | null> {
        return this.getFilePath("videos", fileName);
    }

    async getBasePath(): Promise<string> {
        return window.assets.getBasePath();
    }

    async findAssetByName(name: string, category?: AssetCategory): Promise<AssetInfo | null> {
        if (category) {
            const assets = await this.list(category);
            return assets.find(a => a.name === name) ?? null;
        }

        const manifest = await this.listAll();
        for (const cat of Object.keys(manifest) as AssetCategory[]) {
            const found = manifest[cat].find(a => a.name === name);
            if (found) return found;
        }
        return null;
    }

    async getMapNames(): Promise<string[]> {
        const maps = await this.getMaps();
        return maps.map(m => m.name);
    }

    async getModelNames(): Promise<string[]> {
        const models = await this.getModels();
        return models.map(m => m.name);
    }

    async getTextureNames(): Promise<string[]> {
        const textures = await this.getTextures();
        return textures.map(t => t.name);
    }

    clearCache(): void {
        this.cache.clear();
        this.manifestCache = null;
        this.pathCache.clear();
    }

    invalidateCategory(category: AssetCategory): void {
        this.cache.delete(category);
        this.manifestCache = null;
    }
}

export const AssetManager = new AssetManagerInstance();

