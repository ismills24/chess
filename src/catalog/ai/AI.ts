import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";

/**
 * Interface for AI implementations that select moves.
 * 
 * AI implementations live in the catalog and are used by ChessManager.
 * 
 * Note: getMove can return either synchronously or asynchronously.
 * For parallel implementations using web workers, use the async version.
 */
export interface AI {
    /**
     * Select a move from the given legal moves.
     * 
     * @param state - Current game state
     * @param legalMoves - Array of legal moves to choose from
     * @returns Selected move, or null if no move available.
     *          Can return a Promise for async implementations.
     */
    getMove(state: GameState, legalMoves: Move[]): Move | null | Promise<Move | null>;
}

