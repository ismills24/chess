import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { CaptureEvent, DestroyEvent, GameEvent } from "../../events/GameEvent";
import { EventSequence } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { GameState } from "../../state/GameState";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Interceptor } from "../../events/Interceptor";
import { PlayerColor } from "../../primitives/PlayerColor";

/**
 * When destroyed, explodes and destroys all adjacent pieces.
 */
export class ExplodingDecorator
    extends PieceDecoratorBase
    implements Interceptor<CaptureEvent>, Interceptor<DestroyEvent> {
    readonly priority = 0;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    intercept(ev: CaptureEvent | DestroyEvent, state: GameState): EventSequence {
        if (ev instanceof CaptureEvent && ev.target !== this) return EventSequences.Continue as EventSequence;
        if (ev instanceof DestroyEvent && ev.target !== this) return EventSequences.Continue as EventSequence;
        if (ev.sourceId === this.id) return EventSequences.Continue as EventSequence;

        const events = this.buildExplosionEvents(ev.actor, state);
        return new EventSequence(events, "AbortChain" as any);
    }

    private buildExplosionEvents(actor: PlayerColor, state: GameState): GameEvent[] {
        const events: GameEvent[] = [new DestroyEvent(this, "Exploded", actor, this.id)];
        const offsets = [
            new Vector2Int(-1, -1), new Vector2Int(0, -1), new Vector2Int(1, -1),
            new Vector2Int(-1, 0), new Vector2Int(1, 0),
            new Vector2Int(-1, 1), new Vector2Int(0, 1), new Vector2Int(1, 1),
        ];

        for (const off of offsets) {
            const pos = new Vector2Int(this.inner.position.x + off.x, this.inner.position.y + off.y);
            if (!state.board.isInBounds(pos)) continue;

            const occupant = state.board.getPieceAt(pos);
            if (occupant) {
                events.push(new DestroyEvent(occupant, "Exploded by neighbor", actor, this.id));
            }
        }

        return events;
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new ExplodingDecorator(inner, this.id);
    }
}
