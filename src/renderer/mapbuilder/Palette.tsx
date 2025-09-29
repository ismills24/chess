import React from "react";
import { Color, DecoratorId, PieceId, TileId } from "./types";
import { DECORATORS, PIECES, TILES, iconForDecorator, iconForPiece, iconForTile } from "./paletteData";
import "./styles.css";

type Mode = "white" | "black" | "tiles";
export type Tool =
    | { kind: "piece"; piece: PieceId; color: Color }
    | { kind: "decorator"; decorator: DecoratorId }
    | { kind: "tile"; tile: TileId }
    | { kind: "erase" };

export const Palette: React.FC<{
    mode: Mode;
    tool: Tool;
    setTool: (t: Tool) => void;
}> = ({ mode, tool, setTool }) => {
    return (
        <div className="palette">
            <div className="sectionTitle">Tools</div>
            <div className="toolRow">
                <button
                    className={tool.kind === "erase" ? "btn sel" : "btn"}
                    onClick={() => setTool({ kind: "erase" })}
                >
                    Erase
                </button>
            </div>

            {mode !== "tiles" ? (
                <>
                    <div className="sectionTitle">{mode === "white" ? "White Pieces" : "Black Pieces"}</div>
                    <div className="grid">
                        {PIECES.map(p => (
                            <button
                                key={p}
                                className={tool.kind === "piece" && tool.piece === p ? "cell sel" : "cell"}
                                onClick={() => setTool({ kind: "piece", piece: p, color: mode === "white" ? "White" : "Black" })}
                                title={p}
                            >
                                <img
                                    src={`/assets/${iconForPiece(p)}-${mode === "white" ? "w" : "b"}.svg`}
                                    alt={p}
                                    className="icon"
                                />
                            </button>
                        ))}
                    </div>

                    <div className="sectionTitle">Decorators</div>
                    <div className="grid">
                        {DECORATORS.map(d => (
                            <button
                                key={d}
                                className={tool.kind === "decorator" && tool.decorator === d ? "cell sel" : "cell"}
                                onClick={() => setTool({ kind: "decorator", decorator: d })}
                                title={d}
                            >
                                <span className="emoji">{iconForDecorator(d)}</span>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="sectionTitle">Tiles</div>
                    <div className="grid">
                        {TILES.map(t => (
                            <button
                                key={t}
                                className={tool.kind === "tile" && tool.tile === t ? "cell sel" : "cell"}
                                onClick={() => setTool({ kind: "tile", tile: t })}
                                title={t}
                            >
                                <span className="emoji">{iconForTile(t)}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
