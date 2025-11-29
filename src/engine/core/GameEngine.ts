// src/engine/core/GameEngine.ts
import { PlayerColor } from "../primitives/PlayerColor";
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
} from "../events/GameEvent";
import { GameState } from "../state/GameState";
import { RuleSet } from "../rules/RuleSet";
import { PlayerController } from "../controllers/PlayerController";

/**
 * Central orchestrator for the game engine.
 * Manages canonical pipeline and history.
 * Dispatch() lives in GameEngine.EventPipeline.ts (partial).
 */
import { Move } from "../primitives/Move";

export interface TurnMetrics {
    canonicalEvents: readonly GameEvent[];
    processingTimeMs: number;
    finalState: GameState;
    turnNumber: number;
    player: PlayerColor;
    playerMoveIntent: Move | null; // The original move the player intended, before interceptors modify it
}

export class GameEngine {
    private readonly _history: Array<{ event: GameEvent; state: GameState }> = [];
    private _currentIndex = -1;

    private readonly ruleset: RuleSet;
    private readonly whiteController: PlayerController;
    private readonly blackController: PlayerController;

    onEventPublished?: (ev: GameEvent) => void;
    
    // Debug/metrics tracking
    private _turnMetricsHistory: TurnMetrics[] = [];
    private _canonicalEventsThisTurn: GameEvent[] = [];
    private _turnStartTime: number = 0;
    private _playerMoveIntentThisTurn: Move | null = null;

    constructor(
        initialState: GameState,
        whiteController: PlayerController,
        blackController: PlayerController,
        ruleset: RuleSet
    ) {
        this.ruleset = ruleset;
        this.whiteController = whiteController;
        this.blackController = blackController;

        // Seed with synthetic TurnAdvancedEvent describing the starting player/turn
        const seed = new TurnAdvancedEvent(initialState.currentPlayer, initialState.turnNumber);
        this._history.push({ event: seed, state: initialState });
        this._currentIndex = 0;
    }

    get currentState(): GameState {
        return this._history[this._currentIndex].state;
    }
    get currentIndex(): number {
        return this._currentIndex;
    }
    get historyCount(): number {
        return this._history.length;
    }
    get history(): ReadonlyArray<{ event: GameEvent; state: GameState }> {
        return this._history;
    }
    
    /**
     * Get metrics for the last completed turn (for debugging/performance tracking).
     */
    get lastTurnMetrics(): TurnMetrics | null {
        return this._turnMetricsHistory.length > 0 
            ? this._turnMetricsHistory[this._turnMetricsHistory.length - 1] 
            : null;
    }
    
    /**
     * Get all turn metrics history (for debugging).
     */
    get turnMetricsHistory(): ReadonlyArray<TurnMetrics> {
        return this._turnMetricsHistory;
    }

    isGameOver(): boolean {
        return this.ruleset.isGameOver(this.currentState).over;
    }

    getWinner(): PlayerColor | null {
        const res = this.ruleset.isGameOver(this.currentState);
        return res.over ? res.winner ?? null : null;
    }

    undo(): void {
        if (this._currentIndex > 0) this._currentIndex--;
    }

    redo(): void {
        if (this._currentIndex < this._history.length - 1) this._currentIndex++;
    }

    jumpTo(index: number): void {
        if (index >= 0 && index < this._history.length) this._currentIndex = index;
    }

    /**
     * Undo back to the TurnAdvanced event preceding the last player action.
     * Ported behaviorally identical to C# version.
     */
    undoLastMove(): void {
        if (this._history.length === 0) return;

        // Step back two full turns (white+black) so it's the same side to move.
        let seen = 0;
        let rewindTo = -1;

        for (let i = this._currentIndex; i >= 0; i--) {
            if (this._history[i].event instanceof TurnAdvancedEvent) {
                seen++;
                if (seen === 3) { // current TA, previous TA, and the one we want to land on
                    rewindTo = i;
                    break;
                }
            }
        }
        // If not enough history yet (e.g., only one side moved), go to the seed at index 0
        this._currentIndex = rewindTo >= 0 ? rewindTo : 0;
    }

    redoLastMove(): void {
        if (this._history.length === 0) return;

        // Step forward two full turns if available
        let seen = 0;
        let redoTo = -1;

        for (let i = this._currentIndex + 1; i < this._history.length; i++) {
            if (this._history[i].event instanceof TurnAdvancedEvent) {
                seen++;
                if (seen === 2) { // next TA (opponent), then next (same side to move)
                    redoTo = i;
                    break;
                }
            }
        }
        if (redoTo >= 0) this._currentIndex = redoTo; else this._currentIndex = this._history.length - 1;
    }

    /**
     * Applies a single canonical GameEvent to state and pushes to history.
     * Used by the pipeline after an event survives interception.
     */
    private applyCanonical(ev: GameEvent, simulation: boolean): void {
        const newState = this.applyEventToState(ev, this.currentState);

        // Trim redo branch if needed
        if (this._currentIndex < this._history.length - 1) {
            this._history.splice(this._currentIndex + 1);
        }

        this._history.push({ event: ev, state: newState });
        this._currentIndex++;

        // Track canonical events for this turn (non-simulation only)
        if (!simulation) {
            this._canonicalEventsThisTurn.push(ev);
            this.onEventPublished?.(ev);
        }
    }
    
    /**
     * Start tracking a new turn (called by runTurn).
     * @internal
     */
    _startTurnTracking(): void {
        this._canonicalEventsThisTurn = [];
        this._playerMoveIntentThisTurn = null;
        this._turnStartTime = performance.now();
    }
    
    /**
     * Record the player's move intent (called by runTurn before processing).
     * @internal
     */
    _recordPlayerMoveIntent(move: Move): void {
        this._playerMoveIntentThisTurn = move;
    }
    
    /**
     * Finish tracking a turn and store metrics (called by runTurn).
     * @internal
     */
    _finishTurnTracking(player: PlayerColor, turnNumber: number): void {
        const processingTime = performance.now() - this._turnStartTime;
        const metrics: TurnMetrics = {
            canonicalEvents: [...this._canonicalEventsThisTurn],
            processingTimeMs: processingTime,
            finalState: this.currentState,
            turnNumber,
            player,
            playerMoveIntent: this._playerMoveIntentThisTurn,
        };
        this._turnMetricsHistory.push(metrics);
        // Keep only last 50 turns to prevent memory bloat
        if (this._turnMetricsHistory.length > 50) {
            this._turnMetricsHistory.shift();
        }
        this._canonicalEventsThisTurn = [];
        this._playerMoveIntentThisTurn = null;
    }

    /**
     * Translate a canonical GameEvent into a new GameState (pure).
     */
    private applyEventToState(ev: GameEvent, current: GameState): GameState {
        const board = current.board.clone();
        let nextPlayer = current.currentPlayer;
        let turn = current.turnNumber;

        // console.log(`[Engine] ApplyEventToState: ${ev.constructor.name} (${ev.description})`);

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
        }

        return new GameState(board, nextPlayer, turn);
    }
    

    // Expose for partial (EventPipeline) file
    /** @internal */
    _applyCanonical = (ev: GameEvent, simulation: boolean) => this.applyCanonical(ev, simulation);
}
