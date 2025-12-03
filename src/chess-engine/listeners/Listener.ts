import { ListenerContext } from "./ListenerContext";
import { GameEvent } from "../events/EventRegistry";

/**
 * Interface for objects that can listen to and modify events.
 * Replaces the old Interceptor pattern with a cleaner listener queue model.
 * 
 * Listeners are called in priority order (lower priority = earlier execution).
 * 
 * onBeforeEvent: Can modify or cancel events before they're applied.
 * onAfterEvent: Can generate new events after an event is applied.
 */
export interface Listener {
    /** Priority for execution order (lower = earlier) */
    readonly priority: number;
    
    /**
     * Called before an event is applied to state.
     * 
     * @param ctx - Current state and event log
     * @param event - The event about to be applied
     * @returns 
     *   - Modified event (to replace original)
     *   - Array of events (to cancel original and enqueue all new events)
     *   - null (to cancel event - onAfterEvent will NOT run)
     *   - Same event (to pass through unchanged)
     *   - undefined (same as returning the event unchanged)
     */
    onBeforeEvent?(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null | undefined;
    
    /**
     * Called after an event has been applied to state.
     * Only called if the event was not cancelled in onBeforeEvent.
     * 
     * @param ctx - Current state (now updated) and event log
     * @param event - The event that was just applied
     * @returns Array of new events to enqueue (empty = no new events)
     */
    onAfterEvent?(ctx: ListenerContext, event: GameEvent): GameEvent[];
}

