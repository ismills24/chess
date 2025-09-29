import React, { useState } from "react";
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";
import { PlayApp } from "./play/PlayApp";
import { MapDefinition } from "./mapbuilder/types";

export const App: React.FC = () => {
    const [mode, setMode] = useState<"builder" | "play">("builder");
    const [loadedMap, setLoadedMap] = useState<MapDefinition | null>(null);

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <header style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>
                <button onClick={() => setMode("builder")}>Map Builder</button>
                <button
                    onClick={() => {
                        if (loadedMap) setMode("play");
                        else alert("Load or save a map first!");
                    }}
                >
                    Play
                </button>
            </header>

            <div style={{ flex: 1 }}>
                {mode === "builder" ? (
                    <MapBuilderApp
                        onMapChanged={(map) => {
                            setLoadedMap(map); // track last saved OR loaded map
                        }}
                    />
                ) : loadedMap ? (
                <PlayApp map={loadedMap} />
                ) : (
                <div style={{ padding: 20 }}>No map loaded yet</div>
                )}
            </div>
        </div>
    );
};
