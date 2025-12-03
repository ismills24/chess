// src/ChessManager/ChessManager.ts
import { GameState } from "../engine/state/GameState";
import { Move } from "../engine/primitives/Move";
import { RuleSet } from "../engine/rules/RuleSet";
import { PlayerController } from "../engine/controllers/PlayerController";
import { GameClock } from "../engine/core/GameClock";
import { GameEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent, GameOverEvent, TimeOutEvent } from "../engine/events/GameEvent";
import { PlayerColor } from "../engine/primitives/PlayerColor";
import { ChessEngine, ActionPackages } from "../ChessEngine";
import { FallbackPolicy } from "../engine/events/EventSequence";

/**
 * Manages a single chess game from start to end.
 * Owns the full game lifecycle: history, controllers, clock, turn orchestration.
 * One instance = one game.
 * 
 * ChessManager uses ChessEngine (static, stateless) to resolve moves.
 * ChessManager owns the canonical state history and decides when to apply results.
 */
export class ChessManager {
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
        console.log(`[ChessManager] constructed; seed TurnAdvancedEvent for ${initialState.currentPlayer}`);

        // Notify clock of the initial TurnAdvancedEvent (so it can start if it's the human's turn)
        try {
            if (this.clock) {
                console.log(`[ChessManager] notifying clock of seed TurnAdvancedEvent`);
                this.clock.handleEvent(seed);
            }
        } catch (e) {
            console.error(`[ChessManager] error notifying clock of seed event`, e);
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

    get isGameOver(): boolean {
        // Check for GameOverEvent in history first (takes precedence over ruleset)
        const gameOverEvent = this.getMostRecentGameOverEvent();
        if (gameOverEvent) {
            return true;
        }
        return this.ruleset.isGameOver(this.currentState).over;
    }

    get winner(): PlayerColor | null {
        // Check for GameOverEvent in history first (takes precedence over ruleset)
        const gameOverEvent = this.getMostRecentGameOverEvent();
        if (gameOverEvent) {
            // Winner is the opponent of the losing player
            const winner = gameOverEvent.losingPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
            console.log(`[ChessManager] Winner: ${winner}`);
            return winner;
        }
        const res = this.ruleset.isGameOver(this.currentState);
        const winner = res.over ? res.winner ?? null : null;
        if (winner) {
            console.log(`[ChessManager] Winner: ${winner}`);
        }
        return winner;
    }

    /**
     * Get the most recent GameOverEvent from history up to the current index.
     */
    private getMostRecentGameOverEvent(): GameOverEvent | null {
        for (let i = this._currentIndex; i >= 0; i--) {
            const entry = this._history[i];
            if (entry.event instanceof GameOverEvent) {
                return entry.event;
            }
        }
        return null;
    }

    /**
     * Play a human turn with the given move.
     * Returns the resolved events and the new game state.
     */
    playHumanTurn(move: Move): { events: GameEvent[]; state: GameState } {
        if (this.isGameOver) {
            return { events: [], state: this.currentState };
        }

        const currentState = this.currentState;
        const player = currentState.currentPlayer;

        // TurnStartEvent
        const turnStart = new TurnStartEvent(player, currentState.turnNumber);
        const { newState: stateAfterStart, events: startEvents } = this.dispatchInternal(
            ActionPackages.single(turnStart),
            currentState
        );
        this.applyEventsToHistory(startEvents, currentState);

        // Process the move
        const { newState: stateAfterMove, events: moveEvents } = ChessEngine.resolveMove(
            this.currentState,
            move,
            this.ruleset
        );
        this.applyEventsToHistory(moveEvents, this.currentState);

        // TurnEndEvent
        const turnEnd = new TurnEndEvent(player, this.currentState.turnNumber);
        const { newState: stateAfterEnd, events: endEvents } = this.dispatchInternal(
            ActionPackages.single(turnEnd),
            this.currentState
        );
        this.applyEventsToHistory(endEvents, this.currentState);

        // Advance the turn
        const nextPlayer = this.currentState.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const turnAdvance = new TurnAdvancedEvent(nextPlayer, this.currentState.turnNumber + 1);
        const { newState: finalState, events: advanceEvents } = this.dispatchInternal(
            ActionPackages.single(turnAdvance),
            this.currentState
        );
        this.applyEventsToHistory(advanceEvents, this.currentState);

        // Collect all events from this turn
        const allEvents = [...startEvents, ...moveEvents, ...endEvents, ...advanceEvents];

        return { events: allEvents, state: this.currentState };
    }

    /**
     * Evaluate a move without applying it to history.
     * Used by AI to evaluate moves before deciding which one to play.
     * Returns the resulting state and events, but does NOT mutate history.
     */
    evaluateMove(move: Move): { newState: GameState; events: GameEvent[] } {
        return ChessEngine.resolveMove(this.currentState, move, this.ruleset);
    }

    /**
     * Play an AI turn using the given controller.
     * The AI evaluates moves using evaluateMove() (without history mutation),
     * then once it selects a move, we apply it to the canonical history.
     * Returns the resolved events and the new game state.
     */
    playAITurn(controller: PlayerController): { events: GameEvent[]; state: GameState } {
        if (this.isGameOver) {
            return { events: [], state: this.currentState };
        }

        const currentState = this.currentState;
        const player = currentState.currentPlayer;

        // TurnStartEvent
        const turnStart = new TurnStartEvent(player, currentState.turnNumber);
        const { newState: stateAfterStart, events: startEvents } = this.dispatchInternal(
            ActionPackages.single(turnStart),
            currentState
        );
        this.applyEventsToHistory(startEvents, currentState);

        // AI evaluates moves using evaluateMove() (which doesn't mutate history)
        // The AI controller can call this.evaluateMove() or use ChessEngine.resolveMove() directly
        const move = controller.selectMove(this.currentState);
        if (!move) {
            return { events: startEvents, state: this.currentState };
        }

        // Now apply the chosen move to canonical history
        const { newState: stateAfterMove, events: moveEvents } = ChessEngine.resolveMove(
            this.currentState,
            move,
            this.ruleset
        );
        this.applyEventsToHistory(moveEvents, this.currentState);

        // TurnEndEvent
        const turnEnd = new TurnEndEvent(player, this.currentState.turnNumber);
        const { newState: stateAfterEnd, events: endEvents } = this.dispatchInternal(
            ActionPackages.single(turnEnd),
            this.currentState
        );
        this.applyEventsToHistory(endEvents, this.currentState);

        // Advance the turn
        const nextPlayer = this.currentState.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const turnAdvance = new TurnAdvancedEvent(nextPlayer, this.currentState.turnNumber + 1);
        const { newState: finalState, events: advanceEvents } = this.dispatchInternal(
            ActionPackages.single(turnAdvance),
            this.currentState
        );
        this.applyEventsToHistory(advanceEvents, this.currentState);

        // Collect all events from this turn
        const allEvents = [...startEvents, ...moveEvents, ...endEvents, ...advanceEvents];

        return { events: allEvents, state: this.currentState };
    }

    /**
     * Process a turn (automatically selects the appropriate controller).
     */
    runTurn(): void {
        if (this.isGameOver) return;

        const controller =
            this.currentState.currentPlayer === PlayerColor.White
                ? this.whiteController
                : this.blackController;

        if (controller === this.whiteController || controller === this.blackController) {
            // This is a human controller (has submitMove method)
            const move = controller.selectMove(this.currentState);
            if (move) {
                this.playHumanTurn(move);
            }
        } else {
            // This is an AI controller
            this.playAITurn(controller);
        }
    }

    /**
     * Get all legal moves for the current state.
     */
    getLegalMoves(): Move[] {
        return this.currentState.getAllLegalMoves(this.ruleset);
    }

    /**
     * Get the full state history.
     */
    getStateHistory(): GameState[] {
        return this._history.map(entry => entry.state);
    }

    /**
     * Undo the last move (back to previous TurnAdvanced event).
     */
    undoLastMove(): GameState | null {
        if (this._history.length === 0) return null;

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

        return this.currentState;
    }

    /**
     * Undo one step in history.
     */
    undo(): void {
        if (this._currentIndex > 0) this._currentIndex--;
    }

    /**
     * Redo one step in history.
     */
    redo(): void {
        if (this._currentIndex < this._history.length - 1) this._currentIndex++;
    }

    /**
     * Jump to a specific index in history.
     */
    jumpTo(index: number): void {
        if (index >= 0 && index < this._history.length) this._currentIndex = index;
    }

    /**
     * Internal method to dispatch events using ChessEngine.
     * This is a wrapper around ChessEngine.dispatch() that doesn't mutate history.
     */
    private dispatchInternal(sequence: any, initialState: GameState): { newState: GameState; events: GameEvent[] } {
        return ChessEngine.dispatch(sequence, initialState);
    }

    /**
     * Internal method to apply events to history and notify clock/subscribers.
     */
    private applyEventsToHistory(events: GameEvent[], previousState: GameState): void {
        let currentState = previousState;

        for (const ev of events) {
            // Trim redo branch if needed
            if (this._currentIndex < this._history.length - 1) {
                this._history.splice(this._currentIndex + 1);
            }

            // Apply event to state
            currentState = ChessEngine.applyEventToState(ev, currentState);
            this._history.push({ event: ev, state: currentState });
            this._currentIndex++;

            // Notify clock first (if it exists)
            try {
                this.clock?.handleEvent(ev);
            } catch (e) {
                console.error(`[ChessManager] clock.handleEvent error`, e);
            }

            // Then publish to external subscribers
            try {
                this.onEventPublished?.(ev);
            } catch (e) {
                console.error(`[ChessManager] onEventPublished handler error`, e);
            }
        }
    }

    /**
     * Internal method to publish events (used by clock for TimeOutEvent).
     * TimeOutEvent goes through the interceptor pipeline.
     */
    _publishEvent(ev: GameEvent): void {
        // For TimeOutEvent, route it through ChessEngine.dispatch() so it goes through interceptors
        if (ev instanceof TimeOutEvent) {
            // Check if already in history to avoid duplicates
            const alreadyInHistory = this._history.some(
                entry => entry.event instanceof TimeOutEvent || entry.event instanceof GameOverEvent
            );
            if (!alreadyInHistory) {
                // Use ContinueChain for TimeOutEvent
                const sequence = ActionPackages.single(ev, FallbackPolicy.ContinueChain);
                const result = this.dispatchInternal(sequence, this.currentState);
                this.applyEventsToHistory(result.events, this.currentState);
                console.log(`[ChessManager] TimeOutEvent routed through dispatch() via _publishEvent`);
                return;
            } else {
                console.log(`[ChessManager] TimeOutEvent already in history, publishing to subscribers`);
            }
        }

        // For GameOverEvent (from other sources), add it to history directly
        if (ev instanceof GameOverEvent) {
            const alreadyInHistory = this._history.some(
                entry => entry.event instanceof GameOverEvent
            );
            if (!alreadyInHistory) {
                this.applyEventsToHistory([ev], this.currentState);
                console.log(`[ChessManager] GameOverEvent added to history via _publishEvent`);
                return;
            } else {
                console.log(`[ChessManager] GameOverEvent already in history, publishing to subscribers`);
            }
        }

        // For other events, just publish to external subscribers
        try {
            this.onEventPublished?.(ev);
        } catch (e) {
            console.error(`[ChessManager] onEventPublished handler error`, e);
        }
    }

    /**
     * Get the game clock instance (if provided).
     */
    get gameClock(): GameClock | null {
        return this.clock;
    }
}

