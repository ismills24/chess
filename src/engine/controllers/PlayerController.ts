import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";

/**
 * Interface for player controllers that select moves.
 */
export interface PlayerController {
    /**
     * Select a move for the current player.
     * @param state Current game state
     * @returns A chosen move, or null if no move available
     */
    selectMove(state: GameState): Move | null;
}
