// src/ChessEngine/ChessEngine.ts
import { GameState } from "../engine/state/GameState";
import { Move } from "../engine/primitives/Move";
import { RuleSet } from "../engine/rules/RuleSet";
import {
    GameEvent,
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
} from "../engine/events/GameEvent";
import { EventSequenceLike, FallbackPolicy, EventSequence } from "../engine/events/EventSequence";
import { Interceptor } from "../engine/events/Interceptor";
import { PieceDecoratorBase } from "../engine/pieces/decorators/PieceDecoratorBase";
import { ProcessMove } from "./ProcessMove";

/**
 * Static, stateless chess engine that resolves moves into GameState and events.
 * This is the core computation layer - it has no instance state and only processes moves.
 * 
 * ChessEngine owns the type definitions (interfaces) for Piece, Tile, RuleSet, GameEvent, etc.
 * but does NOT know about specific implementations (e.g., ExplodingDecorator, StandardChess).
 * Those live in the Catalog.
 */
export class ChessEngine {
    /**
     * Resolves a move into a new GameState and the list of canonical events that were applied.
     * This is the ONLY public method of ChessEngine.
     * 
     * @param gameState The current game state
     * @param move The move to resolve
     * @param ruleset The ruleset to use for validation
     * @returns The new game state and the list of events that were actually applied
     */
    static resolveMove(
        gameState: GameState,
        move: Move,
        ruleset: RuleSet
    ): { newState: GameState; events: GameEvent[] } {
        // Build the move sequence (capture + move events)
        const sequence = ProcessMove.buildMoveSequence(move, gameState);
        
        // Dispatch through interceptor pipeline
        return this.dispatch(sequence, gameState);
    }

    /**
     * Executes an EventSequence through the interceptor pipeline.
     * Returns the final state and all events that were actually applied (not aborted).
     * 
     * @internal This is an internal method used by resolveMove() and ChessManager.
     * Not part of the public API but needed for turn orchestration.
     * 
     * @param sequence The event sequence to process
     * @param initialState The initial state to process from
     * @returns The final state and list of canonical events that were applied
     */
    static dispatch(
        sequence: EventSequenceLike,
        initialState: GameState
    ): { newState: GameState; events: GameEvent[] } {
        const appliedEvents: GameEvent[] = [];
        let currentState = initialState;
        const stack: GameEvent[] = [...sequence.events].reverse();

        while (stack.length > 0) {
            const ev = stack.pop()!;

            const { replacement, abort } = this.processInterceptors(ev, currentState);

            if (replacement) {
                if (abort) {
                    // AbortChain triggered → clear remaining stack
                    stack.length = 0;
                }
                // Push replacement events onto stack
                for (let i = replacement.events.length - 1; i >= 0; i--) {
                    stack.push(replacement.events[i]);
                }
                continue;
            }

            // No interceptor changed the event → apply canonically
            currentState = this.applyEventToState(ev, currentState);
            appliedEvents.push(ev);
        }

        return { newState: currentState, events: appliedEvents };
    }

    /**
     * Run interceptors for a given event.
     * Returns a replacement sequence (or undefined) and whether AbortChain was requested.
     * 
     * @internal
     */
    private static processInterceptors(
        ev: GameEvent,
        state: GameState
    ): { replacement?: EventSequenceLike; abort: boolean } {
        const interceptors = InterceptorCollector.getForEvent(ev, state);
        console.log(`[ChessEngine] Processing ${ev.constructor.name} with ${interceptors.length} interceptors`);

        for (const entry of interceptors) {
            console.log(`[ChessEngine] Trying interceptor: ${entry.instance.constructor.name} (priority: ${entry.priority})`);
            const seq = entry.instance.intercept(ev as any, state);

            // Abort: stop everything (with or without replacements)
            if (seq.fallback === FallbackPolicy.AbortChain) {
                return { replacement: seq, abort: true };
            }

            // Continue with replacements - if any interceptor returned events, use them
            if (seq.events.length > 0) {
                return { replacement: seq, abort: false };
            }

            // Continue + 0 events → try next interceptor
        }

        // Default interceptor: Convert TimeOutEvent to GameOverEvent if no interceptor modified it
        if (ev instanceof TimeOutEvent) {
            console.log(`[ChessEngine] TimeOutEvent not modified by interceptors, converting to GameOverEvent`);
            const gameOverEvent = new GameOverEvent(ev.expiredPlayer, ev.sourceId);
            return {
                replacement: new EventSequence([gameOverEvent], FallbackPolicy.ContinueChain),
                abort: false
            };
        }

        return { abort: false };
    }

    /**
     * Translate a canonical GameEvent into a new GameState (pure function).
     * This is the core state mutation logic.
     * 
     * @internal This is an internal implementation detail
     */
    static applyEventToState(ev: GameEvent, current: GameState): GameState {
        const board = current.board.clone();
        let nextPlayer = current.currentPlayer;
        let turn = current.turnNumber;

        if (ev instanceof MoveEvent) {
            // Re-resolve from the cloned board, do not trust payload object identity
            const piece = board.getPieceAt(ev.from);
            if (piece) {
                board.movePiece(ev.from, ev.to);
                piece.movesMade++;
            }
        } else if (ev instanceof CaptureEvent) {
            const pos = ev.target.position;
            if (board.getPieceAt(pos)) board.removePiece(pos);
        } else if (ev instanceof DestroyEvent) {
            const pos = ev.target.position;
            if (board.getPieceAt(pos)) board.removePiece(pos);
        } else if (ev instanceof TurnAdvancedEvent) {
            nextPlayer = ev.nextPlayer;
            turn = ev.turnNumber;
        } else if (ev instanceof TileChangedEvent) {
            board.setTile(ev.position, ev.newTile.clone());
        } else if (ev instanceof PieceChangedEvent) {
            board.removePiece(ev.oldPiece.position);
            board.placePiece(ev.newPiece, ev.position);
        } else if (ev instanceof TurnStartEvent) {
            // no board change
        } else if (ev instanceof TurnEndEvent) {
            // no board change
        } else if (ev instanceof TimeOutEvent) {
            // no board change - TimeOutEvent is converted to GameOverEvent by default interceptor
        } else if (ev instanceof GameOverEvent) {
            // no board change - game over is handled at manager level
        }

        return new GameState(board, nextPlayer, turn);
    }
}

/**
 * Gathers & invokes Interceptor implementations.
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
    return hasIntercept && hasPriority;
}

// Re-export type definitions (interfaces) that ChessEngine owns
export type { Piece } from "../engine/pieces/Piece";
export type { Tile } from "../engine/tiles/Tile";
export type { RuleSet } from "../engine/rules/RuleSet";
export type { GameEvent } from "../engine/events/GameEvent";
export type { Move } from "../engine/primitives/Move";
export type { PlayerColor } from "../engine/primitives/PlayerColor";
export type { Interceptor } from "../engine/events/Interceptor";
export type { EventSequenceLike, EventSequence } from "../engine/events/EventSequence";

