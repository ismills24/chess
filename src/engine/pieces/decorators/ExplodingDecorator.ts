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

    intercept(ev: DestroyEvent, state: GameState): EventSequence {
        // Only handle CaptureEvent and DestroyEvent, ignore other event types
        if (!(ev instanceof CaptureEvent) && !(ev instanceof DestroyEvent)) {
            return EventSequences.Continue as EventSequence;
        }
        
        // Only trigger if this piece is the target (matching C# logic)
        if (ev.target !== this || ev.sourceId === this.id) {
            return EventSequences.Continue as EventSequence;
        }

        const events = this.buildExplosionEvents(ev.actor, state);
        return new EventSequence(events, "AbortChain" as any);
    }

    // intercept(ev: CaptureEvent , state: GameState): EventSequence {
    //     if (ev instanceof CaptureEvent) {
    //         if (ev.target !== this || ev.sourceId === this.id) return EventSequences.Continue as EventSequence;
    
    //         const from = ev.attacker.position;
    //         const to = ev.target.position;
    
    //         const moveFirst = new MoveEvent(from, to, ev.attacker, ev.actor, ev.isPlayerAction, this.id);
    //         const explode = this.buildExplosionEvents(ev.actor, state); // includes DestroyEvent(this, ...), then neighbors
    //         return new EventSequence([moveFirst, ...explode], FallbackPolicy.AbortChain);
    //     }
    
    //     if (ev instanceof DestroyEvent) {
    //         if (ev.target !== this || ev.sourceId === this.id) return EventSequences.Continue as EventSequence;
    //         const explode = this.buildExplosionEvents(ev.actor, state);
    //         return new EventSequence(explode, FallbackPolicy.AbortChain);
    //     }
    
    //     return EventSequences.Continue as EventSequence;
    // }

    private buildExplosionEvents(actor: PlayerColor, state: GameState): GameEvent[] {
        const events: GameEvent[] = [new DestroyEvent(this, "Exploded", actor, this.id)];
        const offsets = [
            new Vector2Int(-1, -1), new Vector2Int(0, -1), new Vector2Int(1, -1),
            new Vector2Int(-1, 0), new Vector2Int(1, 0),
            new Vector2Int(-1, 1), new Vector2Int(0, 1), new Vector2Int(1, 1),
        ];

        // Use the current position of the piece (matching C# Position property)
        const currentPos = this.position;
        for (const off of offsets) {
            const pos = currentPos.add(off);
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
