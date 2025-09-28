// src/engine/core/ProcessMove.ts
import { GameEngine } from "./GameEngine";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { GameEvent, CaptureEvent, MoveEvent } from "../events/GameEvent";
import { EventSequenceLike, FallbackPolicy } from "../events/EventSequence";
import { ActionPackages } from "./action-packages";

export class ProcessMove {
    /**
     * Build an action package (capture -> move) for the given move.
     * No turn-advance here, and no direct state mutation — just the package.
     * Tile effects, slides, Martyr/Guardian/Marksman, promotions, etc.
     * should be handled by interceptors on MoveEvent/CaptureEvent.
     */
    static buildMoveSequence(move: Move, state: GameState): EventSequenceLike {
        const events: GameEvent[] = [];

        const mover = state.board.getPieceAt(move.from);
        if (!mover) return ActionPackages.emptyAbort; // invalid move, abort chain

        const target = state.board.getPieceAt(move.to);
        if (target) {
            events.push(new CaptureEvent(mover, target, state.currentPlayer, true));
        }

        events.push(
            new MoveEvent(
                move.from,
                move.to,
                mover,
                state.currentPlayer,
                true,
                "" // sourceId left empty; interceptors can replace if needed
            )
        );

        return ActionPackages.pack(events, FallbackPolicy.AbortChain);
    }
}

// Convenience passthrough to keep parity with C# API if desired:
(GameEngine.prototype as any).buildMoveSequence = function (move: Move, state: GameState) {
    return ProcessMove.buildMoveSequence(move, state);
};
