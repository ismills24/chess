/**
 * EventRegistry - Union type of all event types in the system.
 * This provides a single type that represents any possible event.
 */
import {
    Event,
    MoveEvent,
    CaptureEvent,
    DestroyEvent,
    TurnAdvancedEvent,
    TurnStartEvent,
    TurnEndEvent,
    TileChangedEvent,
    PieceChangedEvent,
    TimeOutEvent,
    GameOverEvent,
} from "./Event";

export type GameEvent = 
    | MoveEvent
    | CaptureEvent
    | DestroyEvent
    | TurnAdvancedEvent
    | TurnStartEvent
    | TurnEndEvent
    | TileChangedEvent
    | PieceChangedEvent
    | TimeOutEvent
    | GameOverEvent;

// Export all event types
export * from "./Event";

