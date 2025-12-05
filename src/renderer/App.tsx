import React, { useState, useEffect } from "react";
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";
import { PlayApp } from "./play/PlayApp";
import { RogueApp } from "./rogue";
import { MapDefinition } from "./mapbuilder/types";
import { AssetManager, AssetInfo } from "../asset-manager";

export const App: React.FC = () => {
  const [mode, setMode] = useState<"builder" | "play" | "rogue">("rogue");
  const [loadedMap, setLoadedMap] = useState<MapDefinition | null>(null);
  const [savedMaps, setSavedMaps] = useState<AssetInfo[]>([]);
  const [selectedMapName, setSelectedMapName] = useState<string>("");

  useEffect(() => {
    AssetManager.getMaps().then(setSavedMaps);
  }, []);

  const onSelectMap = async (mapName: string) => {
    if (!mapName) return;
    const loaded = await AssetManager.readMap<MapDefinition>(mapName);
    if (loaded) {
      setLoadedMap(loaded);
      setSelectedMapName(mapName);
    }
  };

  const refreshMapList = async () => {
    AssetManager.invalidateCategory("maps");
    const maps = await AssetManager.getMaps();
    setSavedMaps(maps);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "8px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
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
          onClick={() => setMode("play")}
          style={{ fontWeight: mode === "play" ? "bold" : "normal" }}
        >
          Play
        </button>

        {mode === "play" && (
          <>
            <span style={{ marginLeft: "16px" }}>Map:</span>
            <select
              value={selectedMapName}
              onChange={(e) => onSelectMap(e.target.value)}
              style={{ minWidth: "150px" }}
            >
              <option value="">-- Select Map --</option>
              {savedMaps.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <button onClick={refreshMapList} title="Refresh map list">
              ↻
            </button>
          </>
        )}
      </header>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {mode === "rogue" && <RogueApp />}
        {mode === "builder" && (
          <MapBuilderApp
            onMapChanged={(map) => {
              setLoadedMap(map);
              refreshMapList();
            }}
          />
        )}
        {mode === "play" &&
          (loadedMap ? (
            <PlayApp key={selectedMapName} map={loadedMap} />
          ) : (
            <div style={{ padding: 20, textAlign: "center" }}>
              <p>Select a map from the dropdown above to start playing</p>
            </div>
          ))}
      </div>
    </div>
  );
};
