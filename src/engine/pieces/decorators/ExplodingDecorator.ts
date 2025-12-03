import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { CaptureEvent, DestroyEvent, GameEvent, MoveEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
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
    // Run after Marksman (which defaults to 0) so ranged kills happen first
    readonly priority = 1;
    protected readonly decoratorValue = 2;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    intercept(ev: DestroyEvent | CaptureEvent, state: GameState): EventSequence {
        let kind: string;
        if (ev instanceof CaptureEvent) {
            kind = "CaptureEvent";
        } else if (ev instanceof DestroyEvent) {
            kind = "DestroyEvent";
        } else {
            kind = "UnknownEvent";
        }
        // Debug logging for chaining
        console.log(`[Exploding] intercept ${kind} → target.id=${ev.target?.id} self.id=${this.id} sourceId=${ev.sourceId}`);

        // Only care about events targeting this exploding piece, and avoid self-loops
        const isRelevantType = ev instanceof CaptureEvent || ev instanceof DestroyEvent;
        const isTargetSelf = ev.target && ev.target.id === this.id;
        const isSelfSource = ev.sourceId === this.id;
        if (!isRelevantType || !isTargetSelf || isSelfSource) {
            console.log(`[Exploding] skip: relevant=${isRelevantType} targetSelf=${isTargetSelf} selfSource=${isSelfSource}`);
            return EventSequences.Continue as EventSequence;
        }

        // If a player tried to capture this exploding piece via a normal move,
        // recreate the move first so the attacker ends up on the target square,
        // then explode (which will also destroy the attacker if adjacent).
        if (ev instanceof CaptureEvent) {
            if (ev.isPlayerAction) {
                const from = ev.attacker.position;
                const to = ev.target.position;
                const moveFirst = new MoveEvent(from, to, ev.attacker, ev.actor, true, this.id);
                const explode = this.buildExplosionEvents(ev.actor, state);
                console.log(`[Exploding] player capture: injecting MoveEvent then ${explode.length} explosion event(s); AbortChain`);
                return new EventSequence([moveFirst, ...explode], FallbackPolicy.AbortChain);
            }

            // Non-player capture affecting this piece → just explode; do not force movement
            const explode = this.buildExplosionEvents(ev.actor, state);
            console.log(`[Exploding] non-player capture: ${explode.length} explosion event(s); ContinueChain`);
            return new EventSequence(explode, FallbackPolicy.ContinueChain);
        }

        // DestroyEvent targeting this piece (e.g., ranged marksman kill) → just explode
        const explode = this.buildExplosionEvents(ev.actor, state);
        console.log(`[Exploding] destroy: ${explode.length} explosion event(s); ContinueChain`);
        return new EventSequence(explode, FallbackPolicy.ContinueChain);
    }

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
