import { GameEvent } from "./GameEvent";

export enum FallbackPolicy {
    AbortChain = "AbortChain",
    ContinueChain = "ContinueChain",
}

export interface EventSequenceLike {
    readonly events: readonly GameEvent[];
    readonly fallback: FallbackPolicy;
}

export class EventSequence implements EventSequenceLike {
    readonly events: readonly GameEvent[];
    readonly fallback: FallbackPolicy;

    constructor(events: GameEvent[], fallback: FallbackPolicy = FallbackPolicy.AbortChain) {
        this.events = Object.freeze([...events]);
        this.fallback = fallback;
    }
}
