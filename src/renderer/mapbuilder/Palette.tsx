/**
 * Tool Palette for Map Builder
 * 
 * Provides piece, decorator, and tile selection tools.
 * Items can be dragged from the palette onto the 3D board.
 */

import React, { useCallback } from "react";
import { Color, DecoratorId, PieceId, TileId } from "./types";
import { DECORATORS, PIECES, TILES, iconForDecorator, iconForPiece, iconForTile } from "./paletteData";
import { Button, Text, Divider } from "../ui";
import "./styles.css";

// =============================================================================
// Types
// =============================================================================

type Mode = "white" | "black" | "tiles";

export type Tool =
    | { kind: "piece"; piece: PieceId; color: Color }
    | { kind: "decorator"; decorator: DecoratorId }
    | { kind: "tile"; tile: TileId }
    | { kind: "erase" };

// =============================================================================
// Drag Data Serialization
// =============================================================================

export const DRAG_DATA_TYPE = "application/x-mapbuilder-tool";

export function serializeTool(tool: Tool): string {
    return JSON.stringify(tool);
}

export function deserializeTool(data: string): Tool | null {
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// =============================================================================
// Component
// =============================================================================

export const Palette: React.FC<{
    mode: Mode;
    tool: Tool;
    setTool: (t: Tool) => void;
}> = ({ mode, tool, setTool }) => {
    const handlePieceDragStart = useCallback((e: React.DragEvent, piece: PieceId) => {
        const dragTool: Tool = { kind: "piece", piece, color: mode === "white" ? "White" : "Black" };
        e.dataTransfer.setData(DRAG_DATA_TYPE, serializeTool(dragTool));
        e.dataTransfer.effectAllowed = "copy";
    }, [mode]);

    const handleDecoratorDragStart = useCallback((e: React.DragEvent, decorator: DecoratorId) => {
        const dragTool: Tool = { kind: "decorator", decorator };
        e.dataTransfer.setData(DRAG_DATA_TYPE, serializeTool(dragTool));
        e.dataTransfer.effectAllowed = "copy";
    }, []);

    const handleTileDragStart = useCallback((e: React.DragEvent, tile: TileId) => {
        const dragTool: Tool = { kind: "tile", tile };
        e.dataTransfer.setData(DRAG_DATA_TYPE, serializeTool(dragTool));
        e.dataTransfer.effectAllowed = "copy";
    }, []);

    return (
        <div className="palette">
            {/* Erase Tool */}
            <section className="builder-section">
                <Text as="label" variant="caption" color="muted" className="builder-section__label">
                    TOOLS
                </Text>
                <Button
                    variant={tool.kind === "erase" ? "danger" : "ghost"}
                    size="sm"
                    active={tool.kind === "erase"}
                    onClick={() => setTool({ kind: "erase" })}
                    className="w-full"
                >
                    🗑️ Erase
                </Button>
            </section>

            <Divider />

            {mode !== "tiles" ? (
                <>
                    {/* Pieces */}
                    <section className="builder-section">
                        <Text as="label" variant="caption" color="muted" className="builder-section__label">
                            {mode === "white" ? "WHITE PIECES" : "BLACK PIECES"}
                        </Text>
                        <Text variant="caption" color="muted" className="palette__hint">
                            Click to select or drag onto board
                        </Text>
                        <div className="grid">
                            {PIECES.map(p => (
                                <button
                                    key={p}
                                    className={tool.kind === "piece" && tool.piece === p ? "cell sel" : "cell"}
                                    onClick={() => setTool({ kind: "piece", piece: p, color: mode === "white" ? "White" : "Black" })}
                                    draggable
                                    onDragStart={(e) => handlePieceDragStart(e, p)}
                                    title={`${p} - Click to select, drag to place`}
                                >
                                    <img
                                        src={`/assets/${iconForPiece(p)}-${mode === "white" ? "w" : "b"}.svg`}
                                        alt={p}
                                        className="icon"
                                        draggable={false}
                                    />
                                </button>
                            ))}
                        </div>
                    </section>

                    <Divider />

                    {/* Decorators/Abilities */}
                    <section className="builder-section">
                        <Text as="label" variant="caption" color="muted" className="builder-section__label">
                            ABILITIES
                        </Text>
                        <div className="grid">
                            {DECORATORS.map(d => (
                                <button
                                    key={d}
                                    className={tool.kind === "decorator" && tool.decorator === d ? "cell sel" : "cell"}
                                    onClick={() => setTool({ kind: "decorator", decorator: d })}
                                    draggable
                                    onDragStart={(e) => handleDecoratorDragStart(e, d)}
                                    title={`${d} - Click to select, drag to place`}
                                >
                                    <span className="emoji">{iconForDecorator(d)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </>
            ) : (
                <>
                    {/* Tiles */}
                    <section className="builder-section">
                        <Text as="label" variant="caption" color="muted" className="builder-section__label">
                            SPECIAL TILES
                        </Text>
                        <Text variant="caption" color="muted" className="palette__hint">
                            Click to select or drag onto board
                        </Text>
                        <div className="grid">
                            {TILES.map(t => (
                                <button
                                    key={t}
                                    className={tool.kind === "tile" && tool.tile === t ? "cell sel" : "cell"}
                                    onClick={() => setTool({ kind: "tile", tile: t })}
                                    draggable
                                    onDragStart={(e) => handleTileDragStart(e, t)}
                                    title={`${t} - Click to select, drag to place`}
                                >
                                    <span className="emoji">{iconForTile(t)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};
