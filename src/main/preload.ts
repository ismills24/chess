import { contextBridge, ipcRenderer } from "electron";
import type { AssetCategory, AssetEntry, AssetListResult } from "../shared/assetTypes";

contextBridge.exposeInMainWorld("maps", {
    saveJSON: async (data: unknown): Promise<boolean> => {
        const result = await ipcRenderer.invoke("maps:save", JSON.stringify(data, null, 2));
        return result === true;
    },
    openJSON: async <T = unknown>(): Promise<T | null> => {
        const result = await ipcRenderer.invoke("maps:open");
        return result ? (JSON.parse(result) as T) : null;
    },
});

contextBridge.exposeInMainWorld("assets", {
    list: async (category: AssetCategory): Promise<AssetListResult> => {
        return ipcRenderer.invoke("assets:list", category);
    },

    listAll: async (): Promise<Record<AssetCategory, AssetEntry[]>> => {
        return ipcRenderer.invoke("assets:listAll");
    },

    read: async (category: AssetCategory, filename: string): Promise<Uint8Array> => {
        return ipcRenderer.invoke("assets:read", category, filename);
    },

    readJson: async <T = unknown>(category: AssetCategory, filename: string): Promise<T> => {
        return ipcRenderer.invoke("assets:readJson", category, filename);
    },

    write: async (category: AssetCategory, filename: string, data: Uint8Array): Promise<string> => {
        return ipcRenderer.invoke("assets:write", category, filename, data);
    },

    writeJson: async (category: AssetCategory, filename: string, data: unknown): Promise<string> => {
        return ipcRenderer.invoke("assets:writeJson", category, filename, data);
    },

    delete: async (category: AssetCategory, filename: string): Promise<boolean> => {
        return ipcRenderer.invoke("assets:delete", category, filename);
    },

    exists: async (category: AssetCategory, filename: string): Promise<boolean> => {
        return ipcRenderer.invoke("assets:exists", category, filename);
    },

    getUrl: async (category: AssetCategory, filename: string): Promise<string> => {
        return ipcRenderer.invoke("assets:getUrl", category, filename);
    },
});
