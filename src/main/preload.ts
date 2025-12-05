// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import type { AssetCategory, AssetInfo, AssetManifest } from "../asset-manager/types";

contextBridge.exposeInMainWorld("maps", {
    saveJSON: async (data: unknown): Promise<boolean> => {
        const result = await ipcRenderer.invoke("maps:save", JSON.stringify(data, null, 2));
        return result === true;
    },
    openJSON: async <T = any>(): Promise<T | null> => {
        const result = await ipcRenderer.invoke("maps:open");
        return result ? (JSON.parse(result) as T) : null;
    },
});

contextBridge.exposeInMainWorld("assets", {
    list: async (category: AssetCategory): Promise<AssetInfo[]> => {
        return ipcRenderer.invoke("assets:list", category);
    },
    listAll: async (): Promise<AssetManifest> => {
        return ipcRenderer.invoke("assets:listAll");
    },
    read: async (category: AssetCategory, fileName: string): Promise<string | null> => {
        return ipcRenderer.invoke("assets:read", category, fileName);
    },
    readJSON: async <T = unknown>(category: AssetCategory, fileName: string): Promise<T | null> => {
        return ipcRenderer.invoke("assets:readJSON", category, fileName);
    },
    getPath: async (category: AssetCategory, fileName: string): Promise<string | null> => {
        return ipcRenderer.invoke("assets:getPath", category, fileName);
    },
    getBasePath: async (): Promise<string> => {
        return ipcRenderer.invoke("assets:getBasePath");
    },
});
