import { GameEvent } from "./GameEvent";
import { EventSequence, FallbackPolicy, EventSequenceLike } from "./EventSequence";

export const EventSequences = {
    /**
     * No-op: event proceeds canonically.
     */
    Continue: new EventSequence([], FallbackPolicy.ContinueChain),

    /**
     * Suppress the event entirely.
     */
    Abort: new EventSequence([], FallbackPolicy.AbortChain),

    /**
     * Wrap one event with Continue fallback.
     */
    Single(ev: GameEvent): EventSequenceLike {
        return new EventSequence([ev], FallbackPolicy.ContinueChain);
    },

    /**
     * Wrap many events with Continue fallback.
     */
    Many(evs: GameEvent[]): EventSequenceLike {
        return new EventSequence(evs, FallbackPolicy.ContinueChain);
    },
};
