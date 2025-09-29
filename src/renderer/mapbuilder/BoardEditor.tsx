import React from "react";
import { MapDefinition, PlacedPiece, Color } from "./types";
import {
    addDecoratorAt,
    addOrReplacePiece,
    addOrReplaceTile,
    getPieceAt,
    removePieceAt,
    removeTileAt,
} from "./serializer";
import { iconForPiece, iconForDecorator, iconForTile } from "./paletteData";
import "./styles.css";

import type { Tool } from "./Palette";

export const BoardEditor: React.FC<{
    map: MapDefinition;
    setMap: (m: MapDefinition) => void;
    tool: Tool;
    mode: "white" | "black" | "tiles";
}> = ({ map, setMap, tool, mode }) => {
    const onCellClick = (x: number, y: number) => {
        const next = { ...map, pieces: [...map.pieces], tiles: [...map.tiles] };

        if (tool.kind === "erase") {
            removePieceAt(next, x, y);
            removeTileAt(next, x, y);
            setMap(next);
            return;
        }

        if (mode === "tiles") {
            if (tool.kind === "tile") {
                addOrReplaceTile(next, { type: tool.tile, x, y });
                setMap(next);
            }
            return;
        }

        // piece / decorator modes
        if (tool.kind === "piece") {
            const { piece, color } = tool;
            const existing = getPieceAt(next, x, y);
            const decorators = existing?.decorators ?? [];
            const placed: PlacedPiece = { type: piece, color, x, y, decorators };
            addOrReplacePiece(next, placed);
            setMap(next);
        } else if (tool.kind === "decorator") {
            const existing = getPieceAt(next, x, y);
            if (existing) {
                addDecoratorAt(next, x, y, tool.decorator);
                setMap(next);
            }
        }
    };

    const rows = [];
    for (let y = map.height - 1; y >= 0; y--) {
        const cells = [];
        for (let x = 0; x < map.width; x++) {
            const key = `${x}-${y}`;
            const isDark = (x + y) % 2 === 1;
            const piece = map.pieces.find((p) => p.x === x && p.y === y);
            const tile = map.tiles.find((t) => t.x === x && t.y === y);

            cells.push(
                <div
                    key={key}
                    className={`sq ${isDark ? "dark" : "light"}`}
                    onClick={() => onCellClick(x, y)}
                >
                    {/* Tile overlay */}
                    {tile ? (
                        <div className="tileIcon">{iconForTile(tile.type)}</div>
                    ) : null}

                    {/* Piece with decorators */}
                    {piece ? (
                        <PieceIcon
                            name={piece.type}
                            color={piece.color}
                            decorators={piece.decorators}
                        />
                    ) : null}
                </div>
            );
        }
        rows.push(
            <div key={`r-${y}`} className="row">
                {cells}
            </div>
        );
    }

    return <div className="board">{rows}</div>;
};

const PieceIcon: React.FC<{
    name: string;
    color: Color;
    decorators: string[];
}> = ({ name, color, decorators }) => {
    const letter = color === "White" ? "w" : "b";
    const file = iconForPiece(name as any);
    return (
        <div className="pcWrap">
            <img
                src={`/assets/${file}-${letter}.svg`}
                className="pc small"
                draggable={false}
                alt={`${name}-${letter}`}
            />
            {decorators.length > 0 ? (
                <div className="badges">
                    {decorators.map((d, i) => (
                        <span key={i} className="badge">
                            {iconForDecorator(d as any)}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
};
