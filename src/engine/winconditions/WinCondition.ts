import { GameState } from "../state/GameState";
import { PlayerColor } from "../primitives/PlayerColor";

/**
 * Defines a specific win condition for the game.
 */
export interface WinCondition {
    /**
     * Check if this win condition is met and determine the winner.
     * @param state Current game state
     * @returns { over: boolean, winner: PlayerColor | null }
     */
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null };
}
