import React, { useState, useEffect, useCallback } from "react";
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";
import { PlayApp } from "./play/PlayApp";
import { RogueApp } from "./rogue";
import { MapDefinition } from "./mapbuilder/types";
import { AssetManager, AssetInfo } from "../asset-manager";
import { Button, Select, Stack } from "./ui";

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

  const onPlayFromBuilder = useCallback((map: MapDefinition, name: string) => {
    setLoadedMap(map);
    setSelectedMapName(name);
    setMode("play");
  }, []);

  const mapOptions = savedMaps.map((m) => ({
    value: m.name,
    label: m.name,
  }));

  if (mode === "rogue") {
    return (
      <div className="app-root">
        <RogueApp onModeChange={setMode} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <Stack gap="sm" align="center">
          <Button
            onClick={() => setMode("rogue")}
            variant="ghost"
            size="sm"
          >
            🎮 Roguelike
          </Button>
          <Button
            onClick={() => setMode("builder")}
            variant={mode === "builder" ? "primary" : "ghost"}
            size="sm"
          >
            🗺️ Map Builder
          </Button>
          <Button
            onClick={() => setMode("play")}
            variant={mode === "play" ? "primary" : "ghost"}
            size="sm"
          >
            ▶️ Play
          </Button>

          {mode === "play" && (
            <Stack gap="sm" align="center" className="ml-6">
              <Select
                options={mapOptions}
                placeholder="-- Select Map --"
                value={selectedMapName}
                onChange={(e) => onSelectMap(e.target.value)}
                size="sm"
              />
              <Button
                onClick={refreshMapList}
                variant="ghost"
                size="sm"
                title="Refresh map list"
              >
                ↻
              </Button>
            </Stack>
          )}
        </Stack>
      </header>

      <main className="app-main">
        {mode === "builder" && (
          <MapBuilderApp
            onMapChanged={(map) => {
              setLoadedMap(map);
              refreshMapList();
            }}
            onPlayMap={onPlayFromBuilder}
          />
        )}
        {mode === "play" &&
          (loadedMap ? (
            <PlayApp key={selectedMapName} map={loadedMap} />
          ) : (
            <div className="app-empty-state">
              <p>Select a map from the dropdown above to start playing</p>
            </div>
          ))}
      </main>
    </div>
  );
};
