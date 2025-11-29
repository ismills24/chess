import { PlayerColor } from "../primitives/PlayerColor";
import { GameEvent, TimeOutEvent } from "../events/GameEvent";

/**
 * Handler function that determines what events to publish when a player's time expires.
 * This allows clocks to have different behaviors independent of the ruleset.
 * 
 * @param expiredPlayer The player whose time has expired
 * @returns Array of events to publish (can be empty, single event, or multiple events)
 */
export type TimeExpiryHandler = (expiredPlayer: PlayerColor) => GameEvent[];

/**
 * Default time expiry handler.
 */
export class TimeExpiryHandlers {
    /**
     * Sends a TimeOutEvent that goes through the interceptor pipeline.
     * If not intercepted, it will be converted to GameOverEvent by default.
     * This is the standard chess time control behavior.
     */
    static gameOver(expiredPlayer: PlayerColor): GameEvent[] {
        // Send TimeOutEvent - it will go through interceptors and convert to GameOverEvent if not modified
        return [
            new TimeOutEvent(expiredPlayer, "GameClock")
        ];
    }
}

