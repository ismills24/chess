// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

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
