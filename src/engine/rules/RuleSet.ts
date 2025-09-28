import { GameState } from "../state/GameState";
import { PlayerColor } from "../primitives/PlayerColor";
import { Move } from "../primitives/Move";
import { Piece } from "../pieces/Piece";

/**
 * Defines the rules for move legality and game termination.
 */
export interface RuleSet {
    /**
     * Get all legal moves for a piece in the current state.
     * Filters pseudo-legal moves based on game rules (e.g., king safety).
     */
    getLegalMoves(state: GameState, piece: Piece): Move[];

    /**
     * Check if the game is over and determine the winner.
     * @returns { over: boolean, winner: PlayerColor | null }
     */
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null };
}
