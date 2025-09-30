// src/engine/core/GameEngine.EventPipeline.ts
import { GameEngine } from "./GameEngine";
import { GameEvent } from "../events/GameEvent";
import { EventSequenceLike, FallbackPolicy } from "../events/EventSequence";
import { GameState } from "../state/GameState";
import { Interceptor } from "../events/Interceptor";
import { PieceDecoratorBase } from "../pieces/decorators/PieceDecoratorBase";

/**
 * Execute an EventSequence through the interceptor pipeline, mutating state
 * with applyCanonical for any event that survives interception.
 * Returns true if the whole sequence ran to completion, false if it was aborted.
 */
(GameEngine.prototype as any).dispatch = function dispatch(
    sequence: EventSequenceLike,
    simulation: boolean = false
): boolean {
    // console.log(`[Pipeline] Dispatch start: ${sequence.events.length} events, sim=${simulation}`);
    const stack: GameEvent[] = [...sequence.events].reverse();

    while (stack.length > 0) {
        const ev = stack.pop()!;
        // console.log(`[Pipeline] Handling ${ev.constructor.name} (${ev.description})`);

        const { replacement, abort } = processInterceptors(ev, (this as GameEngine).currentState);

        if (replacement) {
            // console.log(`[Pipeline] Interceptor(s) produced ${replacement.events.length} event(s), Fallback=${replacement.fallback}`);
            if (abort) {
                // console.log("[Pipeline] AbortChain triggered → clearing remaining stack");
                stack.length = 0;
            }
            // Push replacements
            for (let i = replacement.events.length - 1; i >= 0; i--) stack.push(replacement.events[i]);
            continue;
        }

        // No interceptor changed the event → apply canonically
        (this as GameEngine)._applyCanonical(ev, simulation);
    }

    // console.log("[Pipeline] Sequence completed");
    return true;
};

/**
 * Run interceptors for a given event.
 * Returns a replacement sequence (or undefined) and whether AbortChain was requested.
 *
 * Note: In C#, reflection filtered interceptors by generic TEvent. In TS, we adopt
 * a duck-typed approach: we collect all interceptors (tiles, pieces, decorators),
 * sort by priority, and let them return Continue with 0 events if not applicable.
 * This keeps authoring simple and preserves behavior.
 */
function processInterceptors(
    ev: GameEvent,
    state: GameState
): { replacement?: EventSequenceLike; abort: boolean } {
    const interceptors = InterceptorCollector.getForEvent(ev, state);
    console.log(`[EventPipeline] Processing ${ev.constructor.name} with ${interceptors.length} interceptors`);

    for (const entry of interceptors) {
        console.log(`[EventPipeline] Trying interceptor: ${entry.instance.constructor.name} (priority: ${entry.priority})`);
        const seq = entry.instance.intercept(ev as any, state);

        // Abort: stop everything (with or without replacements)
        if (seq.fallback === FallbackPolicy.AbortChain) {
            return { replacement: seq, abort: true };
        }

        // Continue with replacements
        if (seq.events.length > 0) {
            return { replacement: seq, abort: false };
        }

        // Continue + 0 events → try next interceptor
    }
    return { abort: false };
}

/**
 * Gathers & invokes Interceptor implementations (no reflection available).
 * We collect Tiles + Pieces (including decorator chains) that expose `intercept` and `priority`.
 */
class InterceptorCollector {
    static collectAll(state: GameState): Array<Interceptor & object> {
        const results: Array<Interceptor & object> = [];

        // Tiles
        for (const tile of state.board.getAllTiles()) {
            if (isInterceptor(tile)) results.push(tile);
        }

        // Pieces (walk decorator chains)
        for (const piece of state.board.getAllPieces()) {
            let current: any = piece;
            let depth = 0;
            // Unwrap decorators to include each layer that may implement Interceptor
            while (true) {
                if (isInterceptor(current)) {
                    console.log(`[InterceptorCollector] Found interceptor: ${current.constructor.name} (depth: ${depth}) for piece: ${piece.name}`);
                    results.push(current);
                }
                if (current instanceof PieceDecoratorBase) {
                    current = current.innerPiece;
                    depth++;
                    continue;
                }
                break;
            }
        }
        console.log(`[InterceptorCollector] Total interceptors collected: ${results.length}`);
        return results;
    }

    static getForEvent(ev: GameEvent, state: GameState): Array<{ instance: Interceptor; priority: number }> {
        const all = this.collectAll(state);
        const matches = all.map((obj) => ({
            instance: obj as unknown as Interceptor,
            priority: (obj as any).priority ?? 0,
        }));

        // Order: priority asc
        matches.sort((a, b) => a.priority - b.priority);
        return matches;
    }
}

function isInterceptor(obj: any): obj is Interceptor {
    const hasIntercept = obj && typeof obj.intercept === "function";
    const hasPriority = typeof obj.priority !== "undefined";
    const result = hasIntercept && hasPriority;
    
    if (obj && obj.constructor && obj.constructor.name === "PiercingDecorator") {
        console.log(`[isInterceptor] Checking PiercingDecorator:`);
        console.log(`[isInterceptor] - hasIntercept: ${hasIntercept}`);
        console.log(`[isInterceptor] - hasPriority: ${hasPriority}`);
        console.log(`[isInterceptor] - priority value: ${obj.priority}`);
        console.log(`[isInterceptor] - result: ${result}`);
    }
    
    return result;
}
