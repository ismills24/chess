import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { PlayerColor } from "../primitives/PlayerColor";
import { GameEvent, MoveEvent, CaptureEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/EventRegistry";
import { Listener } from "../listeners";
import { EventQueue } from "./EventQueue";
import { RuleSet } from "../rules/RuleSet";
import { Piece } from "../state/types";

/**
 * Pure, stateless chess engine.
 * 
 * This is the core logic kernel - it defines the vocabulary (Event types, GameState shape)
 * and implements the listener queue model for processing moves and events.
 * 
 * All methods are static - no instance state.
 */
export class ChessEngine {
    /**
     * Resolve a move and return the resulting state + event log.
     * Pure function - no internal state.
     * Assumes move is valid (validation done via getLegalMoves).
     * 
     * @param initialState - Starting state
     * @param move - The move to resolve
     * @param listeners - All listeners (from pieces, tiles, etc.)
     * @returns Final state and event log
     */
    static resolveMove(
        initialState: GameState,
        move: Move,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    } {
        // Convert move to initial events
        const initialEvents = this.buildMoveEvents(move, initialState);

        // Process through event queue
        return EventQueue.process(initialState, initialEvents, listeners);
    }

    /**
     * Resolve a single event (for TurnStart, TurnEnd, TurnAdvanced, etc.).
     * Useful for turn boundary events.
     * 
     * @param initialState - Starting state
     * @param event - The event to resolve
     * @param listeners - All listeners
     * @returns Final state and event log
     */
    static resolveEvent(
        initialState: GameState,
        event: GameEvent,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    } {
        return EventQueue.process(initialState, [event], listeners);
    }

    /**
     * Resolve a full turn: TurnStart → Move → TurnEnd → TurnAdvanced.
     * Convenience method that orchestrates turn events.
     * 
     * @param initialState - Starting state
     * @param move - The move to resolve
     * @param listeners - All listeners
     * @returns Final state and event log
     */
    static resolveTurn(
        initialState: GameState,
        move: Move,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    } {
        const eventLog: GameEvent[] = [];
        let currentState = initialState;

        // TurnStart
        const turnStartEvent = new TurnStartEvent(initialState.currentPlayer, initialState.turnNumber);
        const turnStartResult = this.resolveEvent(currentState, turnStartEvent, listeners);
        currentState = turnStartResult.finalState;
        eventLog.push(...turnStartResult.eventLog);

        // Move
        const moveResult = this.resolveMove(currentState, move, listeners);
        currentState = moveResult.finalState;
        eventLog.push(...moveResult.eventLog);

        // TurnEnd
        const turnEndEvent = new TurnEndEvent(initialState.currentPlayer, initialState.turnNumber);
        const turnEndResult = this.resolveEvent(currentState, turnEndEvent, listeners);
        currentState = turnEndResult.finalState;
        eventLog.push(...turnEndResult.eventLog);

        // TurnAdvanced
        const nextPlayer = initialState.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const turnAdvancedEvent = new TurnAdvancedEvent(nextPlayer, initialState.turnNumber + 1);
        const turnAdvancedResult = this.resolveEvent(currentState, turnAdvancedEvent, listeners);
        currentState = turnAdvancedResult.finalState;
        eventLog.push(...turnAdvancedResult.eventLog);

        return {
            finalState: currentState,
            eventLog: Object.freeze(eventLog),
        };
    }

    /**
     * Get legal moves for a piece.
     * 
     * @param state - Current state
     * @param piece - The piece
     * @param ruleset - Rule set to use for validation
     * @returns Array of legal moves
     */
    static getLegalMoves(
        state: GameState,
        piece: Piece,
        ruleset: RuleSet
    ): Move[] {
        return ruleset.getLegalMoves(state, piece);
    }

    /**
     * Check if game is over.
     * 
     * @param state - Current state
     * @param ruleset - Rule set to use for game over detection
     * @returns Game over status and winner
     */
    static isGameOver(
        state: GameState,
        ruleset: RuleSet
    ): { over: boolean; winner: PlayerColor | null } {
        return ruleset.isGameOver(state);
    }

    /**
     * Convert a Move into initial events (Capture + Move).
     * This is the entry point for move processing.
     * 
     * @param move - The move to convert
     * @param state - Current state (to check for captures)
     * @returns Array of initial events
     */
    private static buildMoveEvents(move: Move, state: GameState): GameEvent[] {
        const events: GameEvent[] = [];

        const mover = state.board.getPieceAt(move.from);
        if (!mover) {
            // Invalid move - return empty array
            console.log(`[ChessEngine.buildMoveEvents] No mover at ${move.from.toString()}`);
            return [];
        }

        const target = state.board.getPieceAt(move.to);
        if (target) {
            // Capture event
            console.log(`[ChessEngine.buildMoveEvents] Creating CaptureEvent: ${mover.id} captures ${target.id} at ${move.to.toString()}`);
            events.push(new CaptureEvent(mover, target, state.currentPlayer, true));
        } else {
            console.log(`[ChessEngine.buildMoveEvents] No target at ${move.to.toString()}, creating MoveEvent only`);
        }

        // Move event
        events.push(
            new MoveEvent(
                move.from,
                move.to,
                mover,
                state.currentPlayer,
                true,
                mover.id
            )
        );

        console.log(`[ChessEngine.buildMoveEvents] Created ${events.length} events`);
        return events;
    }
}

