import { DecoratorId, PieceId, TileId } from "./types";

export const PIECES: PieceId[] = ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"];
export const DECORATORS: DecoratorId[] = ["Marksman", "Exploding", "Scapegoat"];
export const TILES: TileId[] = ["StandardTile", "GuardianTile", "SlipperyTile"];

// map engine piece names → your SVG asset base names
export function iconForPiece(name: PieceId): string {
    return name.toLowerCase(); // pawn, knight, ...
}

export function iconForDecorator(id: DecoratorId): string {
    // simple emoji-ish fallback; you can replace with real svgs later
    if (id === "Marksman") return "🎯";
    if (id === "Exploding") return "💥";
    if (id === "Scapegoat") return "🛡️";
    return "✨";
}

export function iconForTile(id: TileId): string {
    if (id === "GuardianTile") return "🛡️";
    if (id === "SlipperyTile") return "🧊";
    return "⬜";
}
