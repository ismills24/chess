import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { PlayerColor } from "../primitives/PlayerColor";
import { GameEvent, MoveEvent, CaptureEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/EventRegistry";
import { Listener } from "../listeners";
import { EventQueue } from "./EventQueue";
import { RuleSet } from "../rules/RuleSet";
import { Piece, Tile } from "../state/types";

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
     * Collect all listeners from the current game state.
     * Collects from tiles and pieces (including unwrapping ability chains).
     * 
     * @param state - Current game state
     * @returns Array of all listeners in the state
     */
    private static collectListeners(state: GameState): Listener[] {
        const listeners: Listener[] = [];

        // Collect from tiles
        for (const tile of state.board.getAllTiles()) {
            if (this.isListener(tile)) {
                listeners.push(tile);
            }
        }

        // Collect from pieces (unwrapping ability chains)
        for (const piece of state.board.getAllPieces()) {
            let current: any = piece;
            while (current) {
                if (this.isListener(current)) {
                    listeners.push(current);
                }
                // Check if this is an ability wrapper (has innerPiece property)
                if (current.innerPiece) {
                    current = current.innerPiece;
                } else {
                    break;
                }
            }
        }

        return listeners;
    }

    /**
     * Check if an object implements the Listener interface.
     */
    private static isListener(obj: any): obj is Listener {
        return (
            obj &&
            typeof obj === "object" &&
            typeof obj.priority === "number" &&
            (typeof obj.onBeforeEvent === "function" || typeof obj.onAfterEvent === "function")
        );
    }
    /**
     * Resolve a move and return the resulting state + event log.
     * Pure function - no internal state.
     * Assumes move is valid (validation done via getLegalMoves).
     * 
     * @param initialState - Starting state
     * @param move - The move to resolve
     * @returns Final state and event log
     */
    static resolveMove(
        initialState: GameState,
        move: Move
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    } {
        // Collect listeners from state
        const listeners = this.collectListeners(initialState);

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
     * @returns Final state and event log
     */
    static resolveEvent(
        initialState: GameState,
        event: GameEvent
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    } {
        // Collect listeners from state
        const listeners = this.collectListeners(initialState);
        return EventQueue.process(initialState, [event], listeners);
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
     * Uses move.piece.owner as the actor - ChessEngine doesn't know about turns,
     * just "this player made this move".
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

        // Use move.piece.owner as actor - ChessEngine is turn-agnostic
        const actor = move.piece.owner;

        const target = state.board.getPieceAt(move.to);
        if (target) {
            // Capture event
            console.log(`[ChessEngine.buildMoveEvents] Creating CaptureEvent: ${mover.id} captures ${target.id} at ${move.to.toString()}`);
            events.push(new CaptureEvent(mover, target, actor, true));
        } else {
            console.log(`[ChessEngine.buildMoveEvents] No target at ${move.to.toString()}, creating MoveEvent only`);
        }

        // Move event
        events.push(
            new MoveEvent(
                move.from,
                move.to,
                mover,
                actor,
                true,
                mover.id
            )
        );

        console.log(`[ChessEngine.buildMoveEvents] Created ${events.length} events`);
        return events;
    }
}

