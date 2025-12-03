import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { CaptureEvent, DestroyEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { GameState } from "../../state/GameState";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Interceptor } from "../../events/Interceptor";

/**
 * Sacrifices itself if an adjacent friendly piece would be captured.
 * Cancels the capture, destroys self, and saves ally.
 */
export class ScapegoatDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent>, Interceptor<DestroyEvent> {
    readonly priority = 0;
    protected readonly decoratorValue = 1;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    intercept(ev: CaptureEvent | DestroyEvent | any, _state: GameState): EventSequence {
        // Only handle Capture/Destroy; other events reach interceptors too.
        const isCap = ev instanceof CaptureEvent;
        const isDes = ev instanceof DestroyEvent;
        if (!isCap && !isDes) return EventSequences.Continue as EventSequence;

        // Avoid intercepting our own emitted self-destruction
        if (ev.sourceId === this.id) return EventSequences.Continue as EventSequence;

        const target = ev.target as Piece | undefined;
        if (!target) return EventSequences.Continue as EventSequence;

        // Protect adjacent friendly (from capture or explosion) by sacrificing self
        if (target.id !== this.id && target.owner === this.inner.owner && this.isAdjacent(target.position, this.inner.position)) {
            const martyrDies = new DestroyEvent(this, "Died protecting ally", ev.actor, this.id);
            return new EventSequence([martyrDies], FallbackPolicy.AbortChain);
        }

        return EventSequences.Continue as EventSequence;
    }

    private isAdjacent(a: Vector2Int, b: Vector2Int): boolean {
        return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && !(a.x === b.x && a.y === b.y);
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new ScapegoatDecorator(inner, this.id);
    }
}
