// src/engine/core/GameEngine.ts
import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
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
    GameOverEvent,
    TimeOutEvent,
} from "../events/GameEvent";
import { GameState } from "../state/GameState";
import { RuleSet } from "../rules/RuleSet";
import { PlayerController } from "../controllers/PlayerController";
import { GameClock } from "./GameClock";
import { ActionPackages } from "./action-packages";
import { EventSequence, FallbackPolicy } from "../events/EventSequence";
import { Interceptor } from "../events/Interceptor";

/**
 * Central orchestrator for the game engine.
 * Manages canonical pipeline and history.
 * Dispatch() lives in GameEngine.EventPipeline.ts (partial).
 */
export class GameEngine {
    private readonly _history: Array<{ event: GameEvent; state: GameState }> = [];
    private _currentIndex = -1;

    private readonly ruleset: RuleSet;
    private readonly whiteController: PlayerController;
    private readonly blackController: PlayerController;
    private readonly clock: GameClock | null;

    onEventPublished?: (ev: GameEvent) => void;

    constructor(
        initialState: GameState,
        whiteController: PlayerController,
        blackController: PlayerController,
        ruleset: RuleSet,
        clock?: GameClock | null
    ) {
        this.ruleset = ruleset;
        this.whiteController = whiteController;
        this.blackController = blackController;
        this.clock = clock ?? null;

        // Seed with synthetic TurnAdvancedEvent describing the starting player/turn
        const seed = new TurnAdvancedEvent(initialState.currentPlayer, initialState.turnNumber);
        this._history.push({ event: seed, state: initialState });
        this._currentIndex = 0;
        console.log(`[Engine] constructed; seed TurnAdvancedEvent for ${initialState.currentPlayer}`);

        // Notify clock of the initial TurnAdvancedEvent (so it can start if it's the human's turn)
        // This happens before onEventPublished is set up, so we call handleEvent directly
        try {
            if (this.clock) {
                console.log(`[Engine] notifying clock of seed TurnAdvancedEvent`);
                this.clock.handleEvent(seed);
            }
        } catch (e) {
            console.error(`[Engine] error notifying clock of seed event`, e);
        }
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

    isGameOver(): boolean {
        // Check for GameOverEvent in history first (takes precedence over ruleset)
        const gameOverEvent = this.getMostRecentGameOverEvent();
        if (gameOverEvent) {
            return true;
        }
        return this.ruleset.isGameOver(this.currentState).over;
    }

    getWinner(): PlayerColor | null {
        // Check for GameOverEvent in history first (takes precedence over ruleset)
        const gameOverEvent = this.getMostRecentGameOverEvent();
        if (gameOverEvent) {
            // Winner is the opponent of the losing player
            const winner = gameOverEvent.losingPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
            console.log(`[GameEngine] Winner: ${winner}`);
            return winner;
        }
        const res = this.ruleset.isGameOver(this.currentState);
        const winner = res.over ? res.winner ?? null : null;
        if (winner) {
            console.log(`[GameEngine] Winner: ${winner}`);
        }
        return winner;
    }

    /**
     * Get the most recent GameOverEvent from history up to the current index.
     * Returns null if no game over event exists.
     */
    private getMostRecentGameOverEvent(): GameOverEvent | null {
        // Search backwards from current index to find the most recent GameOverEvent
        for (let i = this._currentIndex; i >= 0; i--) {
            const entry = this._history[i];
            if (entry.event instanceof GameOverEvent) {
                return entry.event;
            }
        }
        return null;
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

        if (!simulation) {
            // Always notify clock first (if it exists)
            try {
                this.clock?.handleEvent(ev);
            } catch (e) {
                console.error(`[Engine] clock.handleEvent error`, e);
            }
            // Then publish to external subscribers
            try {
                this.onEventPublished?.(ev);
            } catch (e) {
                console.error(`[Engine] onEventPublished handler error`, e);
            }
        }
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
        } else if (ev instanceof TimeOutEvent) {
            // no board change - TimeOutEvent is converted to GameOverEvent by default interceptor
        } else if (ev instanceof GameOverEvent) {
            // no board change - game over is handled at engine level
        }

        return new GameState(board, nextPlayer, turn);
    }

    /**
     * Internal method to publish events. Used by clock to publish TimeOutEvent.
     * TimeOutEvent goes through the interceptor pipeline so pieces can intercept it.
     * If not intercepted, it will be converted to GameOverEvent by the default interceptor.
     */
    _publishEvent(ev: GameEvent): void {
        // For TimeOutEvent, route it through dispatch() so it goes through the interceptor pipeline
        if (ev instanceof TimeOutEvent) {
            // Check if already in history to avoid duplicates
            const alreadyInHistory = this._history.some(
                entry => entry.event instanceof TimeOutEvent || entry.event instanceof GameOverEvent
            );
            if (!alreadyInHistory) {
                // Route through dispatch() so it goes through interceptors
                // The default interceptor will convert it to GameOverEvent if not modified
                const sequence = ActionPackages.single(ev, FallbackPolicy.ContinueChain);
                (this as any).dispatch(sequence, false);
                console.log(`[Engine] TimeOutEvent routed through dispatch() via _publishEvent`);
                return;
            } else {
                // Already in history, just publish to subscribers
                console.log(`[Engine] TimeOutEvent already in history, publishing to subscribers`);
            }
        }
        
        // For GameOverEvent (from other sources), add it to history directly
        if (ev instanceof GameOverEvent) {
            // Check if already in history to avoid duplicates
            const alreadyInHistory = this._history.some(
                entry => entry.event instanceof GameOverEvent
            );
            if (!alreadyInHistory) {
                // Add to history using applyCanonical (non-simulation so it publishes)
                this.applyCanonical(ev, false);
                console.log(`[Engine] GameOverEvent added to history via _publishEvent`);
                return; // applyCanonical already publishes the event
            } else {
                // Already in history, just publish to subscribers
                console.log(`[Engine] GameOverEvent already in history, publishing to subscribers`);
            }
        }
        
        // For other events, just publish to external subscribers
        try {
            this.onEventPublished?.(ev);
        } catch (e) {
            console.error(`[Engine] onEventPublished handler error`, e);
        }
    }

    /**
     * Get the game clock instance (if provided).
     */
    get gameClock(): GameClock | null {
        return this.clock;
    }

    // Expose for partial (EventPipeline) file
    /** @internal */
    _applyCanonical = (ev: GameEvent, simulation: boolean) => this.applyCanonical(ev, simulation);
}
