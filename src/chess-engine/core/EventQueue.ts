import { GameState } from "../state/GameState";
import { GameEvent, CaptureEvent, MoveEvent } from "../events/EventRegistry";
import { Listener, ListenerContext } from "../listeners";
import { EventApplier } from "./EventApplier";
import { Vector2Int } from "../primitives/Vector2Int";

const MAX_EVENTS_PER_RESOLUTION = 1000;

/**
 * Processes events through a linear listener queue.
 * 
 * Key differences from old interceptor system:
 * - State updates incrementally after each event
 * - Linear queue (no recursion)
 * - Listeners see live state (no stale references)
 * 
 * Algorithm:
 * 1. Start with initial events
 * 2. While queue not empty:
 *    a. Pop next event
 *    b. Collect listeners, sort by priority (lower = earlier)
 *    c. Run onBeforeEvent listeners
 *       - If any returns null → cancel event, skip to next
 *       - If any modifies event → use modified version
 *    d. If event not cancelled:
 *       - Apply event to current state → new state
 *       - Run onAfterEvent listeners
 *       - Collect new events from listeners
 *       - Enqueue new events
 *       - Update current state
 * 3. Return final state + event log
 */
/**
 * Helper to track pending MoveEvent cancellations.
 * When a CaptureEvent is replaced, we mark that the next MoveEvent with matching from/to should be cancelled.
 */
interface PendingCancellation {
    from: Vector2Int;
    to: Vector2Int;
    pieceId: string;
}

export class EventQueue {
    /**
     * Process events through the listener queue.
     * 
     * @param initialState - Starting state
     * @param initialEvents - Events to process
     * @param listeners - All listeners (from pieces, tiles, etc.)
     * @returns Final state and event log
     */
    static process(
        initialState: GameState,
        initialEvents: GameEvent[],
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
        aborted?: boolean;
    } {
        let currentState = initialState;
        const eventLog: GameEvent[] = [];
        const queue: GameEvent[] = [...initialEvents];
        const pendingCancellations: PendingCancellation[] = [];

        // Collect and sort listeners by priority (lower = earlier) once per queue run
        const sortedListeners = [...listeners].sort((a, b) => a.priority - b.priority);

        let processedEvents = 0;

        while (queue.length > 0) {
            processedEvents++;
            if (processedEvents > MAX_EVENTS_PER_RESOLUTION) {
                const recent = eventLog.slice(-20).map(e => e.description ?? e.constructor.name);
                console.warn(
                    `[EventQueue] Aborting resolution: exceeded max events (${MAX_EVENTS_PER_RESOLUTION}). Recent events:`,
                    recent
                );
                return {
                    finalState: currentState,
                    eventLog: Object.freeze(eventLog),
                    aborted: true,
                };
            }

            const event = queue.shift()!;

            // Create context for listeners
            const context: ListenerContext = {
                state: currentState,
                eventLog: Object.freeze([...eventLog]),
            };

            // Check for pending MoveEvent cancellation
            if (event instanceof MoveEvent) {
                const cancellation = pendingCancellations.find(
                    c => c.from.equals(event.from) && 
                         c.to.equals(event.to) && 
                         c.pieceId === event.piece.id
                );
                if (cancellation) {
                    // Cancel this MoveEvent - it was associated with a replaced CaptureEvent
                    pendingCancellations.splice(pendingCancellations.indexOf(cancellation), 1);
                    continue;
                }
            }

            // Process onBeforeEvent listeners
            let modifiedEvent: GameEvent | null = event;
            let replacementEvents: GameEvent[] | null = null;
            let wasReplaced = false; // Track if event was actually replaced (not just modified)
            
            for (const listener of sortedListeners) {
                if (!listener.onBeforeEvent) continue;

                const result = listener.onBeforeEvent(context, modifiedEvent);
                
                if (result === null) {
                    // Event cancelled - skip to next event
                    modifiedEvent = null;
                    break;
                } else if (Array.isArray(result)) {
                    // Multiple events to replace original - cancel original, enqueue all
                    modifiedEvent = null;
                    replacementEvents = result;
                    wasReplaced = true;
                    break;
                } else if (result !== undefined && result !== modifiedEvent) {
                    // Event replaced with different event - use new version
                    modifiedEvent = result;
                    wasReplaced = true;
                }
                // If result is undefined or same as modifiedEvent, keep current event (pass through)
            }

            // If event was cancelled, handle replacement events or skip
            if (modifiedEvent === null) {
                // If a CaptureEvent was cancelled, also cancel the associated MoveEvent
                if (event instanceof CaptureEvent && event.isPlayerAction) {
                    // Find and remove the MoveEvent in the queue that matches this capture
                    const moveEventIndex = queue.findIndex(
                        e => e instanceof MoveEvent &&
                             e.isPlayerAction &&
                             e.from.equals(event.attacker.position) &&
                             e.to.equals(event.target.position) &&
                             e.piece.id === event.attacker.id
                    );
                    if (moveEventIndex !== -1) {
                        // Remove it immediately - more reliable than cancellation tracking
                        queue.splice(moveEventIndex, 1);
                    }
                }
                
                if (replacementEvents && replacementEvents.length > 0) {
                    // Enqueue replacement events at the FRONT of the queue (process them first)
                    // This ensures replacement events are processed before any remaining events
                    // Note: unshift adds in reverse order, so we need to reverse the array first
                    for (let i = replacementEvents.length - 1; i >= 0; i--) {
                        queue.unshift(replacementEvents[i]);
                    }
                }
                continue;
            }

            // If a CaptureEvent was replaced with a different event type (like DestroyEvent for ranged attack)
            // mark the associated MoveEvent for cancellation
            // Only do this if the event was actually replaced (not just modified)
            if (event instanceof CaptureEvent && 
                wasReplaced &&
                event.isPlayerAction &&
                modifiedEvent !== null &&
                !(modifiedEvent instanceof CaptureEvent)) {
                // Find the MoveEvent in the queue that matches this capture
                const moveEventIndex = queue.findIndex(
                    e => e instanceof MoveEvent &&
                         e.isPlayerAction &&
                         e.from.equals(event.attacker.position) &&
                         e.to.equals(event.target.position) &&
                         e.piece.id === event.attacker.id
                );
                if (moveEventIndex !== -1) {
                    // Mark for cancellation
                    const moveEvent = queue[moveEventIndex] as MoveEvent;
                    pendingCancellations.push({
                        from: moveEvent.from,
                        to: moveEvent.to,
                        pieceId: moveEvent.piece.id,
                    });
                }
            }

            // Check if event is still valid before applying
            if (!modifiedEvent.isStillValid(currentState)) {
                continue;
            }

            // Apply event to state
            currentState = EventApplier.applyEvent(modifiedEvent, currentState);
            eventLog.push(modifiedEvent);

            // Update context with new state
            const afterContext: ListenerContext = {
                state: currentState,
                eventLog: Object.freeze([...eventLog]),
            };

            // Process onAfterEvent listeners
            for (const listener of sortedListeners) {
                if (!listener.onAfterEvent) continue;

                const newEvents = listener.onAfterEvent(afterContext, modifiedEvent);
                if (newEvents && newEvents.length > 0) {
                    // Enqueue new events
                    queue.push(...newEvents);
                }
            }
        }

        return {
            finalState: currentState,
            eventLog: Object.freeze(eventLog),
        };
    }
}

