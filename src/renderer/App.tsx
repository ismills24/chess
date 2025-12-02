import React, { useState } from "react";
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";
import { PlayApp } from "./play/PlayApp";
import { MapDefinition } from "./mapbuilder/types";
import { MapSelector } from "./components/MapSelector";

export const App: React.FC = () => {
    const [mode, setMode] = useState<"builder" | "play">("play");
    const [loadedMap, setLoadedMap] = useState<MapDefinition | null>(null);
    const [selectedFilename, setSelectedFilename] = useState<string | undefined>();

    const handleMapSelect = (map: MapDefinition, filename?: string) => {
        setLoadedMap(map);
        setSelectedFilename(filename);
    };

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <header style={{ padding: "8px", borderBottom: "1px solid #ccc", display: "flex", gap: 12, alignItems: "center" }}>
                <button 
                    onClick={() => setMode("builder")}
                    style={{ fontWeight: mode === "builder" ? "bold" : "normal" }}
                >
                    Map Builder
                </button>
                <button
                    onClick={() => setMode("play")}
                    style={{ fontWeight: mode === "play" ? "bold" : "normal" }}
                >
                    Play
                </button>
                {mode === "play" && (
                    <>
                        <span style={{ marginLeft: 16, color: "#666" }}>Map:</span>
                        <MapSelector
                            onSelect={handleMapSelect}
                            selectedFilename={selectedFilename}
                        />
                    </>
                )}
            </header>

            <div style={{ flex: 1 }}>
                {mode === "builder" ? (
                    <MapBuilderApp
                        onMapChanged={(map) => {
                            setLoadedMap(map);
                        }}
                    />
                ) : loadedMap ? (
                    <PlayApp key={selectedFilename} map={loadedMap} />
                ) : (
                    <div style={{ 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center", 
                        justifyContent: "center",
                        height: "100%",
                        gap: 16,
                        color: "#666"
                    }}>
                        <span style={{ fontSize: 18 }}>Select a map to start playing</span>
                    </div>
                )}
            </div>
        </div>
    );
};
