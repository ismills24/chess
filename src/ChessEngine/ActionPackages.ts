// src/ChessEngine/ActionPackages.ts
import { GameEvent } from "../engine/events/GameEvent";
import { EventSequence, FallbackPolicy } from "../engine/events/EventSequence";

/**
 * Thin helpers for constructing action packages (EventSequence) used by ChessEngine.
 * Keeps "action package" concerns separate from event/interceptor types.
 */
export const ActionPackages = {
    pack(events: GameEvent[], fallback: FallbackPolicy = FallbackPolicy.AbortChain): EventSequence {
        return new EventSequence(events, fallback);
    },

    single(ev: GameEvent, fallback: FallbackPolicy = FallbackPolicy.AbortChain): EventSequence {
        return new EventSequence([ev], fallback);
    },

    get emptyContinue(): EventSequence {
        return new EventSequence([], FallbackPolicy.ContinueChain);
    },

    get emptyAbort(): EventSequence {
        return new EventSequence([], FallbackPolicy.AbortChain);
    },
};

