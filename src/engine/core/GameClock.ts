import { PlayerColor } from "../primitives/PlayerColor";
import { GameEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/GameEvent";
import { TimeExpiryHandler, TimeExpiryHandlers } from "./TimeExpiryHandler";

/**
 * GameClock tracks time for a player and can expire when time runs out.
 * Subscribes to game events to automatically start/pause based on turn lifecycle.
 * 
 * The clock is configurable via TimeExpiryHandler to determine what happens when time expires,
 * allowing different behaviors (game over, draw, penalty, etc.) independent of the ruleset.
 */
export class GameClock {
    private readonly timeBudgetMs: number;
    private isTicking: boolean = false;
    private lastStartTimeMs: number = 0;
    private elapsedMs: number = 0;
    private timerId: number | null = null;
    private readonly onEventPublished: (ev: GameEvent) => void;
    private readonly playerColor: PlayerColor;
    private readonly expiryHandler: TimeExpiryHandler;
    private isExpired: boolean = false;
    private _expiredPlayer: PlayerColor | null = null;

    /**
     * @param timeBudgetMs Total time budget in milliseconds
     * @param startTimeMs Initial timestamp (typically Date.now())
     * @param playerColor Which player this clock tracks
     * @param onEventPublished Callback to publish events (e.g., TimeOutEvent)
     * @param expiryHandler Handler that determines what events to publish when time expires.
     *                      Defaults to gameOver (opponent wins).
     */
    constructor(
        timeBudgetMs: number,
        startTimeMs: number,
        playerColor: PlayerColor,
        onEventPublished: (ev: GameEvent) => void,
        expiryHandler: TimeExpiryHandler = TimeExpiryHandlers.gameOver
    ) {
        this.timeBudgetMs = timeBudgetMs;
        this.playerColor = playerColor;
        this.onEventPublished = onEventPublished;
        this.expiryHandler = expiryHandler;
        this.lastStartTimeMs = startTimeMs;
        console.log(`[GameClock] constructed for ${playerColor} with budget=${timeBudgetMs}ms, start=${startTimeMs}`);
    }

    start(nowMs: number = Date.now()): void {
        try {
            if (this.isExpired || this.isTicking) {
                console.log(`[GameClock] start ignored; expired=${this.isExpired} ticking=${this.isTicking}`);
                return;
            }
            this.isTicking = true;
            this.lastStartTimeMs = nowMs;
            console.log(`[GameClock] start at ${nowMs}; elapsed=${this.elapsedMs}`);
            this.startTimer();
        } catch (e) {
            console.error(`[GameClock] start error`, e);
        }
    }

    pause(nowMs: number = Date.now()): void {
        try {
            if (!this.isTicking) {
                console.log(`[GameClock] pause ignored; not ticking`);
                return;
            }
            this.elapsedMs += nowMs - this.lastStartTimeMs;
            this.isTicking = false;
            console.log(`[GameClock] pause at ${nowMs}; new elapsed=${this.elapsedMs}`);
            this.stopTimer();
        } catch (e) {
            console.error(`[GameClock] pause error`, e);
        }
    }

    getRemaining(nowMs: number = Date.now()): number {
        const currentElapsed = this.isTicking
            ? this.elapsedMs + (nowMs - this.lastStartTimeMs)
            : this.elapsedMs;
        const remaining = Math.max(0, this.timeBudgetMs - currentElapsed);
        return remaining;
    }

    get expired(): boolean {
        return this.isExpired;
    }

    /**
     * Get the player whose time has expired, or null if no time has expired.
     */
    get expiredPlayer(): PlayerColor | null {
        return this._expiredPlayer;
    }

    get elapsed(): number {
        return this.elapsedMs;
    }

    get ticking(): boolean {
        return this.isTicking;
    }

    handleEvent(ev: GameEvent): void {
        try {
            if (this.isExpired) {
                console.log(`[GameClock] handleEvent: expired, ignoring ${ev.constructor.name}`);
                return;
            }
            if (ev instanceof TurnStartEvent) {
                console.log(`[GameClock] TurnStartEvent: ev.player=${ev.player}, this.playerColor=${this.playerColor}, match=${ev.player === this.playerColor}`);
                if (ev.player === this.playerColor) {
                    console.log(`[GameClock] TurnStartEvent for ${ev.player} → start`);
                    this.start();
                }
            } else if (ev instanceof TurnEndEvent) {
                console.log(`[GameClock] TurnEndEvent: ev.player=${ev.player}, this.playerColor=${this.playerColor}, match=${ev.player === this.playerColor}`);
                if (ev.player === this.playerColor) {
                    console.log(`[GameClock] TurnEndEvent for ${ev.player} → pause`);
                    this.pause();
                }
            } else if (ev instanceof TurnAdvancedEvent) {
                // TurnAdvancedEvent indicates whose turn it is now
                console.log(`[GameClock] TurnAdvancedEvent: ev.nextPlayer=${ev.nextPlayer}, this.playerColor=${this.playerColor}, match=${ev.nextPlayer === this.playerColor}`);
                if (ev.nextPlayer === this.playerColor) {
                    console.log(`[GameClock] TurnAdvancedEvent → ${ev.nextPlayer}'s turn → start`);
                    this.start();
                } else {
                    // Not our turn, make sure we're paused
                    if (this.isTicking) {
                        console.log(`[GameClock] TurnAdvancedEvent → not our turn, pausing`);
                        this.pause();
                    }
                }
            } else {
                console.log(`[GameClock] handleEvent: ${ev.constructor.name} (not TurnStart/TurnEnd/TurnAdvanced)`);
            }
        } catch (e) {
            console.error(`[GameClock] handleEvent error`, e);
        }
    }

    setTicking(ticking: boolean, nowMs: number = Date.now()): void {
        if (ticking) this.start(nowMs); else this.pause(nowMs);
    }

    reset(startTimeMs: number = Date.now()): void {
        this.pause();
        this.elapsedMs = 0;
        this.lastStartTimeMs = startTimeMs;
        this.isExpired = false;
        this._expiredPlayer = null;
        console.log(`[GameClock] reset at ${startTimeMs}`);
    }

    private startTimer(): void {
        this.stopTimer();
        const checkExpiry = () => {
            try {
                if (!this.isTicking) return;
                const remaining = this.getRemaining();
                if (remaining <= 0) {
                    this.isExpired = true;
                    this._expiredPlayer = this.playerColor;
                    this.isTicking = false;
                    this.stopTimer();
                    console.log(`[GameClock] expired for ${this.playerColor}`);
                    
                    // Use the configured expiry handler to determine what events to publish
                    const events = this.expiryHandler(this.playerColor);
                    console.log(`[GameClock] expiry handler returned ${events.length} event(s)`);
                    
                    // Publish all events returned by the handler
                    for (const event of events) {
                        try {
                            this.onEventPublished(event);
                        } catch (e) {
                            console.error(`[GameClock] onEventPublished(${event.constructor.name}) error`, e);
                        }
                    }
                } else {
                    const delay = Math.min(100, remaining);
                    this.timerId = (globalThis as any).setTimeout(checkExpiry, delay);
                }
            } catch (e) {
                console.error(`[GameClock] checkExpiry error`, e);
            }
        };
        // Schedule first check
        this.timerId = (globalThis as any).setTimeout(checkExpiry, 0);
    }

    private stopTimer(): void {
        if (this.timerId !== null) {
            try {
                (globalThis as any).clearTimeout(this.timerId);
            } catch {}
            this.timerId = null;
        }
    }

    destroy(): void {
        this.stopTimer();
        this.pause();
        console.log(`[GameClock] destroy`);
    }
}

