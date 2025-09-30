import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { CandidateMoves, MovementRestrictions } from "./MovementHelper";

/**
 * Base contract for all pieces (pawns, rooks, custom roguelike units, etc).
 * Pieces can move, be cloned, and may expose abilities via decorators.
 */
export interface Piece {
    readonly id: string;
    readonly name: string;
    readonly owner: PlayerColor;
    position: Vector2Int;
    movesMade: number;
    capturesMade: number;

    getCandidateMoves(state: GameState): CandidateMoves;
    getRestrictedSquares(state: GameState): MovementRestrictions;
    getValue(): number;
    clone(): Piece;
}
