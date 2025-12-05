import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { MovementRestrictions } from "../../chess-engine/rules/MovementPatterns";

/**
 * Full Tile interface for Catalog tiles.
 * This extends the minimal Tile interface used by ChessEngine state management.
 * 
 * Catalog tiles must implement this interface to work with the engine.
 */
export interface Tile {
    id: string;
    position: Vector2Int;
    clone(): Tile;
    getRestrictedSquares(state: GameState): MovementRestrictions | null;
}



