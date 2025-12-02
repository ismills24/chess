import React, { useState } from "react";
import { BoardEditor } from "./BoardEditor";
import { Palette, Tool } from "./Palette";
import { MapDefinition } from "./types";
import { emptyMap } from "./serializer";
import { MapSelector } from "../components/MapSelector";
import "./styles.css";

type Mode = "white" | "black" | "tiles";

export const MapBuilderApp: React.FC<{
    onMapChanged?: (map: MapDefinition) => void;
  }> = ({ onMapChanged }) => {
    const [mode, setMode] = useState<Mode>("white");
    const [map, setMap] = useState<MapDefinition>(() => emptyMap(8, 8));
    const [tool, setTool] = useState<Tool>({ kind: "erase" });
    

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
        if (ok && onMapChanged) {
          onMapChanged(map); // notify parent
        }
      };

      const onLoad = async () => {
        const loaded = await window.maps.openJSON<MapDefinition>();
        if (loaded) {
          setMap(loaded);
          if (onMapChanged) onMapChanged(loaded); // notify parent too!
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

                <div className="sectionTitle">File</div>
                <div className="toolRow">
                    <button className="btn" onClick={onSave}>
                        Save JSON
                    </button>
                    <button className="btn" onClick={onLoad}>
                        Load File...
                    </button>
                </div>
                <div className="toolRow">
                    <MapSelector
                        onSelect={(loaded, _filename) => {
                            setMap(loaded);
                            if (onMapChanged) onMapChanged(loaded);
                        }}
                    />
                </div>

                <Palette mode={mode} tool={tool} setTool={setTool} />
            </aside>

            <main className="canvas">
                <BoardEditor mode={mode} map={map} setMap={setMap} tool={tool} />
            </main>
        </div>
    );
};
