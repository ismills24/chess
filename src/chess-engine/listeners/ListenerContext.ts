import { GameState } from "../state/GameState";
import { GameEvent } from "../events/EventRegistry";

/**
 * Context passed to listeners during event processing.
 * Provides access to current state and event log.
 */
export interface ListenerContext {
    /** Current live state (includes turnNumber, currentPlayer, board, etc.) */
    readonly state: GameState;
    
    /** Events applied so far in this resolution (in order) */
    readonly eventLog: readonly GameEvent[];
}

