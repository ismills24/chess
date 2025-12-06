import { Vector2Int } from "../primitives/Vector2Int";
import { PlayerColor } from "../primitives/PlayerColor";
import { GameState } from "./GameState";

/**
 * Minimal Piece interface required by Board and GameState.
 * Will be replaced with actual Piece type from Catalog in Phase 2.
 */

export interface MovementRestriction {
    square: Vector2Int;
    type: "obstacle" | "target"
}

export interface MovementRestrictions {
    restrictedSquares: MovementRestriction[];
    sourceId: string;
}

export interface Piece {
    id: string;
    name: string;
    owner: PlayerColor;
    position: Vector2Int;
    movesMade: number;
    capturesMade: number;
    clone(): Piece;
    getRestrictedSquares?(state: GameState): MovementRestrictions | null;
}

/**
 * Minimal Tile interface required by Board and GameState.
 * Will be replaced with actual Tile type from Catalog in Phase 2.
 */
export interface Tile {
    id: string;
    position: Vector2Int;
    clone(): Tile;
    getRestrictedSquares?(state: GameState): MovementRestrictions | null;
}