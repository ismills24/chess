import React, { useState, useEffect } from "react";
import { BoardEditor } from "./BoardEditor";
import { Palette, Tool } from "./Palette";
import { MapDefinition } from "./types";
import { emptyMap } from "./serializer";
import { AssetManager, AssetInfo } from "../../asset-manager";
import "./styles.css";

type Mode = "white" | "black" | "tiles";

export const MapBuilderApp: React.FC<{
    onMapChanged?: (map: MapDefinition) => void;
  }> = ({ onMapChanged }) => {
    const [mode, setMode] = useState<Mode>("white");
    const [map, setMap] = useState<MapDefinition>(() => emptyMap(8, 8));
    const [tool, setTool] = useState<Tool>({ kind: "erase" });
    const [savedMaps, setSavedMaps] = useState<AssetInfo[]>([]);
    const [selectedMapName, setSelectedMapName] = useState<string>("");

    useEffect(() => {
        AssetManager.getMaps().then(setSavedMaps);
    }, []);

    const onLoadFromAssets = async (mapName: string) => {
        if (!mapName) return;
        const loaded = await AssetManager.readMap<MapDefinition>(mapName);
        if (loaded) {
            setMap(loaded);
            setSelectedMapName(mapName);
            if (onMapChanged) onMapChanged(loaded);
        }
    };

    const refreshMapList = async () => {
        AssetManager.invalidateCategory("maps");
        const maps = await AssetManager.getMaps();
        setSavedMaps(maps);
    };
    

    const setSize = (width: number, height: number) => {
        setMap((prev) => ({
            ...prev,
            width,
            height,
            pieces: prev.pieces.filter((p) => p.x < width && p.y < height),
            tiles: prev.tiles.filter((t) => t.x < width && t.y < height),
        }));
    };

    const onSave = async () => {
        const ok = await window.maps.saveJSON(map);
        if (ok) {
          await refreshMapList();
          if (onMapChanged) onMapChanged(map);
        }
      };

      const onLoad = async () => {
        const loaded = await window.maps.openJSON<MapDefinition>();
        if (loaded) {
          setMap(loaded);
          setSelectedMapName("");
          if (onMapChanged) onMapChanged(loaded);
        }
      };

    return (
        <div className="builderLayout">
            <aside className="sidebar">
                <div className="sectionTitle">Mode</div>
                <div className="toolRow">
                    <button className={mode === "white" ? "btn sel" : "btn"} onClick={() => setMode("white")}>
                        White
                    </button>
                    <button className={mode === "black" ? "btn sel" : "btn"} onClick={() => setMode("black")}>
                        Black
                    </button>
                    <button className={mode === "tiles" ? "btn sel" : "btn"} onClick={() => setMode("tiles")}>
                        Tiles
                    </button>
                </div>

                <div className="sectionTitle">Board Size</div>
                <div className="toolRow">
                    <label>
                        W&nbsp;
                        <input
                            type="number"
                            min={2}
                            max={24}
                            value={map.width}
                            onChange={(e) => setSize(Number(e.target.value), map.height)}
                        />
                    </label>
                    <label>
                        H&nbsp;
                        <input
                            type="number"
                            min={2}
                            max={24}
                            value={map.height}
                            onChange={(e) => setSize(map.width, Number(e.target.value))}
                        />
                    </label>
                </div>

                <div className="sectionTitle">Starting Player</div>
                <div className="toolRow">
                    <button
                        className={map.startingPlayer === "White" ? "btn sel" : "btn"}
                        onClick={() => setMap({ ...map, startingPlayer: "White" })}
                    >
                        White
                    </button>
                    <button
                        className={map.startingPlayer === "Black" ? "btn sel" : "btn"}
                        onClick={() => setMap({ ...map, startingPlayer: "Black" })}
                    >
                        Black
                    </button>
                </div>

                <div className="sectionTitle">Saved Maps</div>
                <div className="toolRow">
                    <select
                        value={selectedMapName}
                        onChange={(e) => onLoadFromAssets(e.target.value)}
                        style={{ flex: 1 }}
                    >
                        <option value="">-- Select Map --</option>
                        {savedMaps.map((m) => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                    </select>
                    <button className="btn" onClick={refreshMapList} title="Refresh list">
                        ↻
                    </button>
                </div>

                <div className="sectionTitle">File</div>
                <div className="toolRow">
                    <button className="btn" onClick={onSave}>
                        Save JSON
                    </button>
                    <button className="btn" onClick={onLoad}>
                        Load JSON
                    </button>
                </div>

                <Palette mode={mode} tool={tool} setTool={setTool} />
            </aside>

            <main className="canvas">
                <BoardEditor mode={mode} map={map} setMap={setMap} tool={tool} />
            </main>
        </div>
    );
};
