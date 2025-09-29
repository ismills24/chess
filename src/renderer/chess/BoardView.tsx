import React, { useMemo, useState } from "react";
import { useEngine, useEngineState } from "./EngineContext";
import { Vector2Int } from "../../engine/primitives/Vector2Int";
import { Move } from "../../engine/primitives/Move";
import { PlayerColor } from "../../engine/primitives/PlayerColor";
import "./board.css";
import { iconForDecorator, iconForTile } from "../mapbuilder/paletteData";
import { getDecoratorIds, getTileId } from "./iconHelpers";

type Coord = { x: number; y: number };

export const BoardView: React.FC = () => {
    const state = useEngineState();
    const { rules, submitHumanMove } = useEngine();

    // selection
    const [selected, setSelected] = useState<Coord | null>(null);
    const legalTargets = useMemo(() => {
        if (!selected) return new Set<string>();
        const piece = state.board.getPieceAt(new Vector2Int(selected.x, selected.y));
        if (!piece) return new Set<string>();
        if (piece.owner !== state.currentPlayer) return new Set<string>();
        return new Set(
            rules
                .getLegalMoves(state, piece)
                .map((m) => `${m.to.x},${m.to.y}`)
        );
    }, [selected, state, rules]);

    const onSquareClick = (x: number, y: number) => {
        // Allow the current player to act (both White and Black in human vs human mode)

        const pos = new Vector2Int(x, y);
        const piece = state.board.getPieceAt(pos);

        if (selected) {
            // If clicked a legal destination, perform move
            if (legalTargets.has(`${x},${y}`)) {
                const from = new Vector2Int(selected.x, selected.y);
                const mover = state.board.getPieceAt(from);
                if (mover) {
                    const mv = new Move(from, pos, mover);
                    submitHumanMove(mv); // controller + engine handle both human and AI turns
                    setSelected(null);
                }
                return;
            }
            // Otherwise, change selection if clicked own piece; or clear
            if (piece && piece.owner === state.currentPlayer) {
                setSelected({ x, y });
            } else {
                setSelected(null);
            }
        } else {
            // No selection yet: select your piece (current player)
            if (piece && piece.owner === state.currentPlayer) {
                setSelected({ x, y });
            }
        }
    };

    // render 8x8 from top (y=7) to bottom (y=0)
    const rows = [];
    for (let y = state.board.height - 1; y >= 0; y--) {
        const cells = [];
        for (let x = 0; x < state.board.width; x++) {
            const pos = new Vector2Int(x, y);
            const p = state.board.getPieceAt(pos);
            const key = `${x}-${y}`;
            const isDark = (x + y) % 2 === 1;
            const isSelected = selected?.x === x && selected?.y === y;
            const isLegal = legalTargets.has(`${x},${y}`);

            const tile = state.board.getTile(pos);
            const tileId = getTileId(tile);
            const tileIcon = tileId === "StandardTile" ? "" : iconForTile(tileId);
            const decos = p ? getDecoratorIds(p) : [];

            cells.push(
                <div
                    key={key}
                    className={[
                        "sq",
                        isDark ? "dark" : "light",
                        isSelected ? "sel" : "",
                        isLegal ? "legal" : "",
                    ]
                        .join(" ")
                        .trim()}
                    onClick={() => onSquareClick(x, y)}
                >
                    {/* tile icon under piece (hide for StandardTile) */}
                    {tileId !== "StandardTile" ? (
                        <span className="tile-icon">{tileIcon}</span>
                    ) : null}
                    {p ? <PieceIcon owner={p.owner} name={p.name} /> : null}
                    {/* decorator icons overlay */}
                    {decos.map((d, i) => (
                        <span key={`${key}-deco-${i}`} className="deco-icon">{iconForDecorator(d)}</span>
                    ))}
                </div>
            );
        }
        rows.push(
            <div key={`r-${y}`} className="row">
                {cells}
            </div>
        );
    }

    return (
        <div className="board-wrap">
            <div className="bar">
                <strong>Turn:</strong>&nbsp;{state.currentPlayer}
                <span style={{ marginLeft: 16 }}>
                    <strong>Move #</strong>&nbsp;{state.turnNumber}
                </span>
            </div>
            <div className="board">{rows}</div>
        </div>
    );
};

const PieceIcon: React.FC<{ owner: PlayerColor; name: string }> = ({ owner, name }) => {
    // expected filenames like "bishop-b.svg", "king-w.svg"
    const letter = owner === PlayerColor.White ? "w" : "b";
    const file = iconFile(name);
    const src = `/assets/${file}-${letter}.svg`;
    return <img src={src} className="pc" draggable={false} alt={`${name.toLowerCase()}-${letter}`} />;
};

// Map engine piece names → asset base names
function iconFile(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("pawn")) return "pawn";
    if (n.includes("knight")) return "knight";
    if (n.includes("bishop")) return "bishop";
    if (n.includes("rook")) return "rook";
    if (n.includes("queen")) return "queen";
    if (n.includes("king")) return "king";
    // fall back to pawn icon
    return "pawn";
}
