export type AssetCategory =
    | "maps"
    | "models"
    | "textures"
    | "fonts"
    | "media";

export interface AssetEntry {
    name: string;
    filename: string;
    path: string;
    extension: string;
    category: AssetCategory;
    size: number;
    modifiedAt: number;
}

export interface AssetListResult {
    category: AssetCategory;
    assets: AssetEntry[];
}

export const ASSET_EXTENSIONS: Record<AssetCategory, string[]> = {
    maps: [".json"],
    models: [".gltf", ".glb", ".obj", ".fbx"],
    textures: [".png", ".jpg", ".jpeg", ".webp", ".tga", ".bmp", ".hdr", ".exr"],
    fonts: [".ttf", ".otf", ".woff", ".woff2"],
    media: [".mp4", ".webm", ".ogg", ".mp3", ".wav", ".gif", ".png", ".jpg", ".jpeg", ".webp"],
};

