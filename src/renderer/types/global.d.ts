export { };

declare global {
    interface Window {
        maps: {
            saveJSON(data: unknown): Promise<boolean>;
            openJSON<T = any>(): Promise<T | null>;
        };
    }
}
