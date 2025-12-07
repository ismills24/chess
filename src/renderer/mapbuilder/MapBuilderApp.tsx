/**
 * Map Builder Application
 * 
 * Visual editor for creating and editing chess maps with 3D preview.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Board3DEditor } from "./Board3DEditor";
import { Palette, Tool } from "./Palette";
import { MapDefinition, PlacedPiece, PlacedTile } from "./types";
import { emptyMap, addOrReplacePiece, addOrReplaceTile, removePieceAt, removeTileAt, getPieceAt, addDecoratorAt } from "./serializer";
import { AssetManager, AssetInfo } from "../../asset-manager";
import { Button, Input, Select, Text, Stack, Divider, IconButton } from "../ui";
import "./styles.css";

type EditorMode = "white" | "black" | "tiles";

export const MapBuilderApp: React.FC<{
    onMapChanged?: (map: MapDefinition) => void;
    onPlayMap?: (map: MapDefinition, name: string) => void;
}> = ({ onMapChanged, onPlayMap }) => {
    const [map, setMap] = useState<MapDefinition>(() => emptyMap(8, 8));
    
    const [mode, setMode] = useState<EditorMode>("white");
    const [tool, setTool] = useState<Tool>({ kind: "erase" });
    
    const [savedMaps, setSavedMaps] = useState<AssetInfo[]>([]);
    const [currentMapName, setCurrentMapName] = useState<string>("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isNewMap, setIsNewMap] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showNameInput, setShowNameInput] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

    useEffect(() => {
        AssetManager.getMaps().then(setSavedMaps);
    }, []);

    useEffect(() => {
        if (saveStatus === "saved") {
            const timer = setTimeout(() => setSaveStatus("idle"), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const applyTool = useCallback((x: number, y: number, toolToApply: Tool) => {
        setMap(prev => {
            const next = { ...prev, pieces: [...prev.pieces], tiles: [...prev.tiles] };

            if (toolToApply.kind === "erase") {
                removePieceAt(next, x, y);
                removeTileAt(next, x, y);
                return next;
            }

            if (toolToApply.kind === "tile") {
                addOrReplaceTile(next, { type: toolToApply.tile, x, y });
                return next;
            }

            if (toolToApply.kind === "piece") {
                const { piece, color } = toolToApply;
                const existing = getPieceAt(next, x, y);
                const decorators = existing?.decorators ?? [];
                const placed: PlacedPiece = { type: piece, color, x, y, decorators };
                addOrReplacePiece(next, placed);
            } else if (toolToApply.kind === "decorator") {
                const existing = getPieceAt(next, x, y);
                if (existing) {
                    addDecoratorAt(next, x, y, toolToApply.decorator);
                }
            }
            return next;
        });
        setHasUnsavedChanges(true);
    }, []);

    const onCellClick = useCallback((x: number, y: number) => {
        applyTool(x, y, tool);
    }, [tool, applyTool]);

    const onDropTool = useCallback((x: number, y: number, droppedTool: Tool) => {
        applyTool(x, y, droppedTool);
    }, [applyTool]);

    const setSize = useCallback((width: number, height: number) => {
        setMap(prev => ({
            ...prev,
            width: Math.max(2, Math.min(24, width)),
            height: Math.max(2, Math.min(24, height)),
            pieces: prev.pieces.filter(p => p.x < width && p.y < height),
            tiles: prev.tiles.filter(t => t.x < width && t.y < height),
        }));
        setHasUnsavedChanges(true);
    }, []);

    const clearMap = useCallback(() => {
        setMap(prev => ({ ...prev, pieces: [], tiles: [] }));
        setHasUnsavedChanges(true);
    }, []);

    const refreshMapList = useCallback(async () => {
        AssetManager.invalidateCategory("maps");
        const maps = await AssetManager.getMaps();
        setSavedMaps(maps);
    }, []);

    const onLoadMap = useCallback(async (mapName: string) => {
        if (!mapName) return;
        const loaded = await AssetManager.readMap<MapDefinition>(mapName);
        if (loaded) {
            setMap(loaded);
            setCurrentMapName(mapName.replace(/\.json$/, ""));
            setIsNewMap(false);
            setHasUnsavedChanges(false);
            setShowNameInput(false);
            if (onMapChanged) onMapChanged(loaded);
        }
    }, [onMapChanged]);

    const onSave = useCallback(async () => {
        const name = currentMapName.trim();
        if (!name) {
            setShowNameInput(true);
            return;
        }
        
        setSaveStatus("saving");
        const ok = await window.maps.saveToFile(name, map);
        if (ok) {
            await refreshMapList();
            setHasUnsavedChanges(false);
            setIsNewMap(false);
            setSaveStatus("saved");
            if (onMapChanged) onMapChanged(map);
        } else {
            setSaveStatus("error");
        }
    }, [map, currentMapName, refreshMapList, onMapChanged]);

    const onNewMap = useCallback(() => {
        setMap(emptyMap(8, 8));
        setCurrentMapName("");
        setIsNewMap(true);
        setHasUnsavedChanges(false);
        setShowNameInput(true);
    }, []);

    const onPlayClick = useCallback(() => {
        if (onPlayMap) {
            onPlayMap(map, currentMapName || "Untitled");
        }
    }, [map, currentMapName, onPlayMap]);

    const mapOptions = useMemo(() => 
        savedMaps.map(m => ({ 
            value: m.name, 
            label: m.name.replace(/\.json$/, "") 
        })),
    [savedMaps]);

    const displayName = currentMapName || "Untitled Map";
    const pieceCount = map.pieces.length;
    const tileCount = map.tiles.length;

    return (
        <div className="builder-app">
            <aside className={`builder-sidebar ${sidebarCollapsed ? "builder-sidebar--collapsed" : ""}`}>
                <div className="builder-sidebar__header">
                    <Text as="h2" variant="subheading">Map Builder</Text>
                    <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        {sidebarCollapsed ? "→" : "←"}
                    </IconButton>
                </div>

                {!sidebarCollapsed && (
                    <div className="builder-sidebar__content">
                        <section className="builder-section">
                            <Text as="label" variant="caption" color="muted" className="builder-section__label">
                                EDITOR MODE
                            </Text>
                            <div className="builder-mode-tabs">
                                <button
                                    className={`builder-mode-tab ${mode === "white" ? "builder-mode-tab--active" : ""}`}
                                    onClick={() => setMode("white")}
                                >
                                    ⚪ White
                                </button>
                                <button
                                    className={`builder-mode-tab ${mode === "black" ? "builder-mode-tab--active" : ""}`}
                                    onClick={() => setMode("black")}
                                >
                                    ⚫ Black
                                </button>
                                <button
                                    className={`builder-mode-tab ${mode === "tiles" ? "builder-mode-tab--active" : ""}`}
                                    onClick={() => setMode("tiles")}
                                >
                                    🔲 Tiles
                                </button>
                            </div>
                        </section>

                        <Divider />

                        <Palette mode={mode} tool={tool} setTool={setTool} />

                        <Divider />

                        <section className="builder-section">
                            <Text as="label" variant="caption" color="muted" className="builder-section__label">
                                BOARD SETTINGS
                            </Text>
                            
                            <div className="builder-size-inputs">
                                <div className="builder-size-input">
                                    <label>Width</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={24}
                                        value={map.width}
                                        onChange={e => setSize(Number(e.target.value), map.height)}
                                    />
                                </div>
                                <span className="builder-size-separator">×</span>
                                <div className="builder-size-input">
                                    <label>Height</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={24}
                                        value={map.height}
                                        onChange={e => setSize(map.width, Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="builder-starting-player">
                                <Text variant="caption" color="muted">Starting Player</Text>
                                <Stack gap="xs">
                                    <Button
                                        onClick={() => {
                                            setMap(m => ({ ...m, startingPlayer: "White" }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        variant={map.startingPlayer === "White" ? "secondary" : "ghost"}
                                        size="sm"
                                        active={map.startingPlayer === "White"}
                                    >
                                        White
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setMap(m => ({ ...m, startingPlayer: "Black" }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        variant={map.startingPlayer === "Black" ? "secondary" : "ghost"}
                                        size="sm"
                                        active={map.startingPlayer === "Black"}
                                    >
                                        Black
                                    </Button>
                                </Stack>
                            </div>
                        </section>

                        <Divider />

                        <section className="builder-section">
                            <Button onClick={clearMap} variant="ghost" size="sm" className="builder-clear-btn">
                                🗑️ Clear Board
                            </Button>
                        </section>

                        <div className="builder-stats">
                            <div className="builder-stat">
                                <span className="builder-stat__value">{pieceCount}</span>
                                <span className="builder-stat__label">pieces</span>
                            </div>
                            <div className="builder-stat">
                                <span className="builder-stat__value">{tileCount}</span>
                                <span className="builder-stat__label">tiles</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            <main className="builder-canvas">
                {/* Overlay Toolbar */}
                <div className="builder-toolbar">
                    <div className="builder-toolbar__left">
                        <div className="builder-toolbar__map-selector">
                            <Select
                                options={mapOptions}
                                placeholder="Load map..."
                                value=""
                                onChange={e => onLoadMap(e.target.value)}
                                size="sm"
                            />
                            <IconButton variant="ghost" size="sm" onClick={refreshMapList} title="Refresh maps">
                                ↻
                            </IconButton>
                        </div>

                        <div className="builder-toolbar__divider" />

                        {showNameInput ? (
                            <div className="builder-toolbar__name-input">
                                <Input
                                    value={currentMapName}
                                    onChange={e => setCurrentMapName(e.target.value)}
                                    placeholder="Enter map name..."
                                    size="sm"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            setShowNameInput(false);
                                            onSave();
                                        }
                                        if (e.key === "Escape") {
                                            setShowNameInput(false);
                                        }
                                    }}
                                />
                                <IconButton 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowNameInput(false)}
                                >
                                    ✕
                                </IconButton>
                            </div>
                        ) : (
                            <button 
                                className="builder-toolbar__name"
                                onClick={() => setShowNameInput(true)}
                                title="Click to rename"
                            >
                                <span className="builder-toolbar__name-text">{displayName}</span>
                                {hasUnsavedChanges && (
                                    <span className="builder-toolbar__unsaved">●</span>
                                )}
                                {isNewMap && (
                                    <span className="builder-toolbar__new-badge">NEW</span>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="builder-toolbar__right">
                        {saveStatus === "saving" && (
                            <span className="builder-toolbar__status builder-toolbar__status--saving">
                                Saving...
                            </span>
                        )}
                        {saveStatus === "saved" && (
                            <span className="builder-toolbar__status builder-toolbar__status--saved">
                                ✓ Saved
                            </span>
                        )}
                        {saveStatus === "error" && (
                            <span className="builder-toolbar__status builder-toolbar__status--error">
                                Save failed
                            </span>
                        )}

                        <Button onClick={onNewMap} variant="ghost" size="sm">
                            ✚ New
                        </Button>
                        <Button 
                            onClick={onSave} 
                            variant={hasUnsavedChanges ? "success" : "secondary"} 
                            size="sm"
                            disabled={saveStatus === "saving"}
                        >
                            💾 Save
                        </Button>
                        <div className="builder-toolbar__divider" />
                        <Button 
                            onClick={onPlayClick} 
                            variant="primary" 
                            size="sm"
                            disabled={pieceCount === 0}
                        >
                            ▶ Play
                        </Button>
                    </div>
                </div>

                <Board3DEditor
                    map={map}
                    onCellClick={onCellClick}
                    onDropTool={onDropTool}
                    tool={tool}
                    mode={mode}
                />
            </main>
        </div>
    );
};
