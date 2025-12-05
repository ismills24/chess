import React, { useState } from "react";
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";
import { PlayApp } from "./play/PlayApp";
import { RogueApp } from "./rogue";
import { MapDefinition } from "./mapbuilder/types";

export const App: React.FC = () => {
    const [mode, setMode] = useState<"builder" | "play" | "rogue">("rogue");
    const [loadedMap, setLoadedMap] = useState<MapDefinition | null>(null);

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <header style={{ padding: "8px", borderBottom: "1px solid #ccc", display: "flex", gap: "8px" }}>
                <button 
                    onClick={() => setMode("rogue")}
                    style={{ fontWeight: mode === "rogue" ? "bold" : "normal" }}
                >
                    🎮 Roguelike
                </button>
                <button 
                    onClick={() => setMode("builder")}
                    style={{ fontWeight: mode === "builder" ? "bold" : "normal" }}
                >
                    Map Builder
                </button>
                <button
                    onClick={() => {
                        if (loadedMap) setMode("play");
                        else alert("Load or save a map first!");
                    }}
                    style={{ fontWeight: mode === "play" ? "bold" : "normal" }}
                >
                    Play
                </button>
            </header>

            <div style={{ flex: 1, overflow: "hidden" }}>
                {mode === "rogue" && <RogueApp />}
                {mode === "builder" && (
                    <MapBuilderApp
                        onMapChanged={(map) => {
                            setLoadedMap(map); // track last saved OR loaded map
                        }}
                    />
                )}
                {mode === "play" && (
                    loadedMap ? (
                        <PlayApp map={loadedMap} />
                    ) : (
                        <div style={{ padding: 20 }}>No map loaded yet</div>
                    )
                )}
            </div>
        </div>
    );
};
