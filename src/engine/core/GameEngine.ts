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
    TimeExpiredEvent,
} from "../events/GameEvent";
import { GameState } from "../state/GameState";
import { RuleSet } from "../rules/RuleSet";
import { PlayerController } from "../controllers/PlayerController";
import { GameClock } from "./GameClock";
import { HumanController } from "../controllers/HumanController";

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
    private timeExpiredFor: PlayerColor | null = null;

    onEventPublished?: (ev: GameEvent) => void;

    constructor(
        initialState: GameState,
        whiteController: PlayerController,
        blackController: PlayerController,
        ruleset: RuleSet,
        timeBudgetMs?: number,
        startTimeMs?: number
    ) {
        this.ruleset = ruleset;
        this.whiteController = whiteController;
        this.blackController = blackController;

        // Create clock for human player if time budget provided
        if (timeBudgetMs !== undefined && timeBudgetMs > 0) {
            const humanPlayer = this.detectHumanPlayer();
            console.log(`[Engine] timeBudget provided=${timeBudgetMs}, humanPlayer=${humanPlayer}`);
            if (humanPlayer !== null) {
                const startTime = startTimeMs ?? Date.now();
                this.clock = new GameClock(
                    timeBudgetMs,
                    startTime,
                    humanPlayer,
                    (player) => this.handleTimeExpired(player)
                );
            } else {
                this.clock = null;
            }
        } else {
            this.clock = null;
        }

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
        // Check time expiry first (takes precedence)
        if (this.timeExpiredFor !== null) {
            return true;
        }
        return this.ruleset.isGameOver(this.currentState).over;
    }

    getWinner(): PlayerColor | null {
        // Time expiry takes precedence
        if (this.timeExpiredFor !== null) {
            // Winner is the opponent of the player who ran out of time
            return this.timeExpiredFor === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        }
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

        if (!simulation) {
            // Always notify clock first (if it exists)
            try {
                this.clock?.handleEvent(ev);
            } catch (e) {
                console.error(`[Engine] clock.handleEvent error`, e);
            }
            // Then notify external subscribers
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
        } else if (ev instanceof TimeExpiredEvent) {
            // no board change - time expiry is handled at engine level
        }

        return new GameState(board, nextPlayer, turn);
    }

    /**
     * Handle time expiry for a player.
     * Publishes TimeExpiredEvent and sets the expiry flag.
     */
    private handleTimeExpired(player: PlayerColor): void {
        if (this.timeExpiredFor !== null) return; // Already expired
        this.timeExpiredFor = player;
        const timeExpiredEvent = new TimeExpiredEvent(player);
        console.log(`[Engine] handleTimeExpired for ${player}`);
        // Publish the event (but don't dispatch it through pipeline - it's a notification)
        try {
            this.onEventPublished?.(timeExpiredEvent);
        } catch (e) {
            console.error(`[Engine] onEventPublished(TimeExpiredEvent) error`, e);
        }
    }

    /**
     * Get the game clock instance (if created).
     */
    get gameClock(): GameClock | null {
        return this.clock;
    }

    /**
     * Detect which player is controlled by a HumanController.
     * Returns null if neither player is human.
     * Uses constructor name check instead of instanceof for reliability across module boundaries.
     */
    private detectHumanPlayer(): PlayerColor | null {
        // Check constructor name (more reliable than instanceof in Electron)
        const whiteIsHuman = this.whiteController.constructor.name === 'HumanController' || 
                            (this.whiteController as any).submitMove !== undefined;
        const blackIsHuman = this.blackController.constructor.name === 'HumanController' || 
                            (this.blackController as any).submitMove !== undefined;
        console.log(`[Engine] detectHumanPlayer: whiteController.constructor.name=${this.whiteController.constructor.name}, blackController.constructor.name=${this.blackController.constructor.name}`);
        console.log(`[Engine] detectHumanPlayer: whiteIsHuman=${whiteIsHuman}, blackIsHuman=${blackIsHuman}`);
        if (whiteIsHuman) {
            return PlayerColor.White;
        }
        if (blackIsHuman) {
            return PlayerColor.Black;
        }
        return null;
    }

    // Expose for partial (EventPipeline) file
    /** @internal */
    _applyCanonical = (ev: GameEvent, simulation: boolean) => this.applyCanonical(ev, simulation);
}
