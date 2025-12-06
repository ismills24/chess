import { GameState } from "../chess-engine/state/GameState";
import { Move } from "../chess-engine/primitives/Move";
import { PlayerColor } from "../chess-engine/primitives/PlayerColor";
import { GameEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../chess-engine/events/EventRegistry";
import { ChessEngine } from "../chess-engine/core/ChessEngine";
import { RuleSet } from "../chess-engine/rules/RuleSet";
import { Piece } from "../chess-engine/state/types";
import { AI } from "../catalog/ai/AI";

/**
 * Manages a single chess match from start to finish.
 * 
 * Responsibilities:
 * - Maintains canonical list of GameStates and history
 * - Tracks turn counter
 * - Provides move execution, undo/redo, legal moves
 * - Delegates to ChessEngine for move resolution
 * 
 * Does NOT know about:
 * - Listeners (collected internally by ChessEngine)
 * - Event types (just passes through event logs)
 * - Piece types (just uses Piece interface)
 */
export class ChessManager {
    private readonly _history: Array<{ 
        state: GameState; 
        eventLog: readonly GameEvent[];
        resolveTimeMs?: number; // Time taken to resolve this move (in milliseconds)
    }> = [];
    private _currentIndex = -1;
    private readonly ruleset: RuleSet;

    constructor(initialState: GameState, ruleset: RuleSet) {
        this.ruleset = ruleset;
        
        // Seed history with initial state (no timing for initial state)
        this._history.push({ state: initialState, eventLog: [] });
        this._currentIndex = 0;
    }

    /**
     * Get the current game state.
     */
    get currentState(): GameState {
        return this._history[this._currentIndex].state;
    }

    /**
     * Get the full history of states, event logs, and timing information.
     */
    get history(): readonly { 
        state: GameState; 
        eventLog: readonly GameEvent[];
        resolveTimeMs?: number;
    }[] {
        return this._history;
    }

    /**
     * Get the current history index.
     */
    get currentIndex(): number {
        return this._currentIndex;
    }

    /**
     * Execute a move and advance the game state.
     * 
     * Orchestrates: TurnStart → Move → TurnEnd → (optionally) TurnAdvanced.
     * ChessEngine is turn-agnostic, so ChessManager handles turn management.
     * 
     * @param move - The move to execute
     * @param advanceTurn - Whether to advance the turn after the move (default: true)
     * @returns Result with success status, new state, event log, and timing information
     */
    playMove(move: Move, advanceTurn: boolean = true): {
        success: boolean;
        newState: GameState;
        eventLog: readonly GameEvent[];
        resolveTimeMs?: number;
    } {
        const currentState = this.currentState;

        // Validate move: piece must exist
        // Note: We don't enforce turn alternation here - that's up to the caller/RuleSet
        if (!move.piece) {
            return {
                success: false,
                newState: currentState,
                eventLog: [],
            };
        }

        // Start timing for the entire move resolution
        const startTime = performance.now();

        // Orchestrate: TurnStart → Move → TurnEnd → (optionally) TurnAdvanced
        const eventLog: GameEvent[] = [];
        let state = currentState;

        // TurnStart
        const turnStartEvent = new TurnStartEvent(currentState.currentPlayer, currentState.turnNumber);
        const turnStartResult = ChessEngine.resolveEvent(state, turnStartEvent);
        state = turnStartResult.finalState;
        eventLog.push(...turnStartResult.eventLog);

        // Move
        const moveResult = ChessEngine.resolveMove(state, move);
        state = moveResult.finalState;
        eventLog.push(...moveResult.eventLog);

        // TurnEnd
        const turnEndEvent = new TurnEndEvent(currentState.currentPlayer, currentState.turnNumber);
        const turnEndResult = ChessEngine.resolveEvent(state, turnEndEvent);
        state = turnEndResult.finalState;
        eventLog.push(...turnEndResult.eventLog);

        // TurnAdvanced (optional)
        if (advanceTurn) {
            const nextPlayer = currentState.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
            const turnAdvancedEvent = new TurnAdvancedEvent(nextPlayer, currentState.turnNumber + 1);
            const turnAdvancedResult = ChessEngine.resolveEvent(state, turnAdvancedEvent);
            state = turnAdvancedResult.finalState;
            eventLog.push(...turnAdvancedResult.eventLog);
        }

        // Calculate total resolution time
        const resolveTimeMs = performance.now() - startTime;

        // Add to history with timing information
        this._history.push({
            state: state,
            eventLog: Object.freeze(eventLog),
            resolveTimeMs: resolveTimeMs,
        });
        this._currentIndex = this._history.length - 1;

        return {
            success: true,
            newState: state,
            eventLog: Object.freeze(eventLog),
            resolveTimeMs: resolveTimeMs,
        };
    }

    /**
     * Get all legal moves for the current player.
     * 
     * @returns Array of legal moves
     */
    getLegalMoves(): Move[] {
        const state = this.currentState;
        const allMoves: Move[] = [];

        // Get legal moves for all pieces of the current player
        for (const piece of state.board.getAllPieces(state.currentPlayer)) {
            const moves = ChessEngine.getLegalMoves(state, piece, this.ruleset);
            allMoves.push(...moves);
        }

        return allMoves;
    }

    /**
     * Get legal moves for a specific piece.
     * 
     * @param piece - The piece to get moves for
     * @returns Array of legal moves for this piece
     */
    getLegalMovesForPiece(piece: Piece): Move[] {
        return ChessEngine.getLegalMoves(this.currentState, piece, this.ruleset);
    }

    /**
     * Check if the game is over.
     * 
     * @returns True if game is over
     */
    isGameOver(): boolean {
        return ChessEngine.isGameOver(this.currentState, this.ruleset).over;
    }

    /**
     * Get the winner of the game, if any.
     * 
     * @returns Winner color, or null if game not over or draw
     */
    getWinner(): PlayerColor | null {
        return ChessEngine.isGameOver(this.currentState, this.ruleset).winner;
    }

    /**
     * Undo the last move (go back one step in history).
     */
    undo(): void {
        if (this._currentIndex > 0) {
            this._currentIndex--;
        }
    }

    /**
     * Redo the last undone move (go forward one step in history).
     */
    redo(): void {
        if (this._currentIndex < this._history.length - 1) {
            this._currentIndex++;
        }
    }

    /**
     * Jump to a specific point in history.
     * 
     * @param index - History index to jump to
     */
    jumpTo(index: number): void {
        if (index >= 0 && index < this._history.length) {
            this._currentIndex = index;
        }
    }

    /**
     * Undo the last move (convenience method).
     */
    undoLastMove(): void {
        this.undo();
    }

    /**
     * Execute an AI turn for the specified player.
     * 
     * @param playerColor - The player color for the AI
     * @param ai - The AI implementation to use
     * @returns Result with success status, new state, event log, and timing information
     */
    playAITurn(playerColor: PlayerColor, ai: AI): {
        success: boolean;
        newState: GameState;
        eventLog: readonly GameEvent[];
        resolveTimeMs?: number;
    } {
        const overallStart = performance.now();
        const state = this.currentState;

        // Verify it's the AI's turn
        if (state.currentPlayer !== playerColor) {
            return {
                success: false,
                newState: state,
                eventLog: [],
                resolveTimeMs: performance.now() - overallStart,
            };
        }

        // Get legal moves for the current player
        const legalMoves = this.getLegalMoves();

        // Let AI select a move (timing for AI selection is not included in resolveTimeMs)
        const move = ai.getMove(state, legalMoves);

        if (!move) {
            return {
                success: false,
                newState: state,
                eventLog: [],
                resolveTimeMs: performance.now() - overallStart,
            };
        }

        // Execute the move with turn advancement (standard chess behavior)
        const moveResult = this.playMove(move, true);

        // Total time includes AI selection + move resolution
        const totalTimeMs = performance.now() - overallStart;

        // Update the just-written history entry to reflect total time (selection + resolution)
        if (moveResult.success && this._history.length > 0) {
            const last = this._history[this._history.length - 1];
            last.resolveTimeMs = totalTimeMs;
        }

        return {
            ...moveResult,
            resolveTimeMs: totalTimeMs,
        };
    }
}

