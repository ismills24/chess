import { MovementRestrictions } from "../pieces/MovementHelper";
import { Vector2Int } from "../primitives/Vector2Int";
import { GameState } from "../state/GameState";

/**
 * Base contract for all tiles.
 */
export interface Tile {
    id: string;
    position: Vector2Int;
    clone(): Tile;
    getRestrictedSquares(state: GameState): MovementRestrictions;
}
