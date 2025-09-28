import { Vector2Int } from "../primitives/Vector2Int";

/**
 * Base contract for all tiles.
 */
export interface Tile {
    id: string;
    position: Vector2Int;
    clone(): Tile;
}
