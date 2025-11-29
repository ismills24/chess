import { PlayerColor } from "../primitives/PlayerColor";
import { GameEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/GameEvent";

/**
 * GameClock tracks time for a player and can expire when time runs out.
 * Subscribes to game events to automatically start/pause based on turn lifecycle.
 */
export class GameClock {
    private readonly timeBudgetMs: number;
    private isTicking: boolean = false;
    private lastStartTimeMs: number = 0;
    private elapsedMs: number = 0;
    private timerId: number | null = null;
    private readonly onExpire: (player: PlayerColor) => void;
    private readonly playerColor: PlayerColor;
    private isExpired: boolean = false;

    /**
     * @param timeBudgetMs Total time budget in milliseconds
     * @param startTimeMs Initial timestamp (typically Date.now())
     * @param playerColor Which player this clock tracks
     * @param onExpire Callback when time expires
     */
    constructor(
        timeBudgetMs: number,
        startTimeMs: number,
        playerColor: PlayerColor,
        onExpire: (player: PlayerColor) => void
    ) {
        this.timeBudgetMs = timeBudgetMs;
        this.playerColor = playerColor;
        this.onExpire = onExpire;
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
                    this.isTicking = false;
                    this.stopTimer();
                    console.log(`[GameClock] expired for ${this.playerColor}`);
                    this.onExpire(this.playerColor);
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

