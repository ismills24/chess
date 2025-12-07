import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves, MovementRestrictions } from "../../chess-engine";

/**
 * Full Piece interface for Catalog pieces.
 * This extends the minimal Piece interface used by ChessEngine state management.
 * 
 * Catalog pieces must implement this interface to work with the engine.
 */
export interface Piece {
    readonly id: string;
    /** Stable identity for the underlying base piece (order-agnostic across decorators) */
    readonly entityId?: string;
    readonly name: string;
    readonly owner: PlayerColor;
    position: Vector2Int;
    movesMade: number;
    capturesMade: number;

    getCandidateMoves(state: GameState): CandidateMoves;
    getRestrictedSquares(state: GameState): MovementRestrictions | null;
    getValue(): number;
    clone(): Piece;
}



