import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { MoveEvent, CaptureEvent, DestroyEvent, GameEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { GameState } from "../../state/GameState";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Interceptor } from "../../events/Interceptor";

/**
 * Makes the piece jump over its target instead of capturing it.
 * The piece lands on the square directly behind the target and captures whatever is there.
 * If the target is on the board edge, normal capture occurs.
 */
export class PiercingDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    readonly priority = 1; // Run after basic movement validation but before other effects
    protected readonly decoratorValue = 2;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    intercept(ev: CaptureEvent, state: GameState): EventSequence {
        if (!(ev instanceof CaptureEvent)) return EventSequences.Continue as EventSequence;
        if (!ev.isPlayerAction) return EventSequences.Continue as EventSequence;
        if (!this.isOurCapture(ev)) {
            return EventSequences.Continue as EventSequence;
        }

        const step = this.computeUnitStep(ev.attacker, ev.target);
        if (!step) {
            return EventSequences.Continue as EventSequence;
        }

        const landingSquare = ev.target.position.add(step);
        const inBounds = state.board.isInBounds(landingSquare);
        if (!inBounds) {
            return EventSequences.Continue as EventSequence;
        }

        const landingPiece = state.board.getPieceAt(landingSquare);
        if (this.isFriendly(landingPiece)) {
            return EventSequences.Continue as EventSequence;
        }

        const events = this.buildPierceEvents(ev, landingSquare, landingPiece);
        return new EventSequence(events, FallbackPolicy.AbortChain);
    }

    private isOurCapture(ev: CaptureEvent): boolean {
        if (!ev.attacker) return false;
        return ev.attacker.owner === this.inner.owner && ev.attacker.position.equals(this.inner.position);
    }

    private computeUnitStep(attacker: Piece, target: Piece): Vector2Int | null {
        const dx = Math.sign(target.position.x - attacker.position.x);
        const dy = Math.sign(target.position.y - attacker.position.y);
        if (dx === 0 && dy === 0) return null;
        return new Vector2Int(dx, dy);
    }

    private isFriendly(piece: Piece | null): boolean {
        return !!piece && piece.owner === this.inner.owner;
    }

    private buildPierceEvents(ev: CaptureEvent, landingSquare: Vector2Int, landingPiece: Piece | null): GameEvent[] {
        const attacker = ev.attacker;
        if (!attacker) return [];
        if (landingPiece) {
            return [
                new DestroyEvent(landingPiece, "Pierced", ev.actor, this.id),
                new MoveEvent(attacker.position, landingSquare, attacker, ev.actor, ev.isPlayerAction, this.id),
            ];
        }
        return [new MoveEvent(attacker.position, landingSquare, attacker, ev.actor, ev.isPlayerAction, this.id)];
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new PiercingDecorator(inner, this.id);
    }
}
