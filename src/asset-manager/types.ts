export type AssetCategory = "maps" | "models" | "textures" | "fonts" | "images" | "videos";

export interface AssetInfo {
    name: string;
    path: string;
    extension: string;
    category: AssetCategory;
    size: number;
    modifiedAt: number;
}

export interface AssetManifest {
    maps: AssetInfo[];
    models: AssetInfo[];
    textures: AssetInfo[];
    fonts: AssetInfo[];
    images: AssetInfo[];
    videos: AssetInfo[];
}

export const ASSET_EXTENSIONS: Record<AssetCategory, readonly string[]> = {
    maps: [".json"],
    models: [".gltf", ".glb", ".obj", ".fbx"],
    textures: [".png", ".jpg", ".jpeg", ".webp", ".tga", ".dds"],
    fonts: [".ttf", ".otf", ".woff", ".woff2"],
    images: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    videos: [".mp4", ".webm", ".mov", ".avi"],
} as const;

export const ASSET_DIRECTORIES: Record<AssetCategory, string> = {
    maps: "assets/maps",
    models: "assets/models",
    textures: "assets/textures",
    fonts: "assets/fonts",
    images: "assets/media/images",
    videos: "assets/media/videos",
} as const;

