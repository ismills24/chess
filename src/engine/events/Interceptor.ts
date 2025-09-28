import { GameEvent, CaptureEvent, DestroyEvent } from "./GameEvent";
import { EventSequenceLike } from "./EventSequence";
import { GameState } from "../state/GameState";
import { Piece } from "../pieces/Piece";

/**
 * Interface for objects that can intercept and modify events.
 */
export interface Interceptor<TEvent extends GameEvent = GameEvent> {
    readonly priority: number;
    intercept(ev: TEvent, state: GameState): EventSequenceLike;
}

/**
 * Utility guard helpers for interceptors.
 */
export const InterceptorGuards = {
    isTarget(self: Piece, ev: GameEvent): boolean {
        if (ev instanceof DestroyEvent) return ev.target === self;
        if (ev instanceof CaptureEvent) return ev.target === self;
        return false;
    },

    isSource(self: Piece, ev: GameEvent): boolean {
        return ev.sourceId === self.id;
    },

    isAttacker(self: Piece, ev: GameEvent): boolean {
        return ev instanceof CaptureEvent && ev.attacker === self;
    },
};
