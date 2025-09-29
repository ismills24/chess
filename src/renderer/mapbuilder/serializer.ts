import { MapDefinition, PlacedPiece, PlacedTile } from "./types";

export function emptyMap(width = 8, height = 8): MapDefinition {
    return { width, height, startingPlayer: "White", pieces: [], tiles: [] };
}

export function toGrid<T>(width: number, height: number, fill: T): T[][] {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

export function addOrReplacePiece(map: MapDefinition, piece: PlacedPiece) {
    const idx = map.pieces.findIndex(p => p.x === piece.x && p.y === piece.y);
    if (idx >= 0) map.pieces[idx] = piece; else map.pieces.push(piece);
}

export function getPieceAt(map: MapDefinition, x: number, y: number): PlacedPiece | undefined {
    return map.pieces.find(p => p.x === x && p.y === y);
}

export function removePieceAt(map: MapDefinition, x: number, y: number) {
    map.pieces = map.pieces.filter(p => !(p.x === x && p.y === y));
}

export function addDecoratorAt(map: MapDefinition, x: number, y: number, deco: string) {
    const p = getPieceAt(map, x, y);
    if (!p) return;
    if (!p.decorators.includes(deco as any)) p.decorators.push(deco as any);
}

export function addOrReplaceTile(map: MapDefinition, tile: PlacedTile) {
    const idx = map.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
    if (idx >= 0) map.tiles[idx] = tile; else map.tiles.push(tile);
}

export function removeTileAt(map: MapDefinition, x: number, y: number) {
    map.tiles = map.tiles.filter(t => !(t.x === x && t.y === y));
}
