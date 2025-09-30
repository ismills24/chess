import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { MoveEvent, CaptureEvent, DestroyEvent, GameEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { GameState } from "../../state/GameState";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Interceptor } from "../../events/Interceptor";

/**
 * Makes the piece bounce captured enemies backward from the direction it came from.
 * The captured piece is moved to the square behind it (from the attacker's perspective),
 * and the attacker moves to the target's original position.
 * If the bounce square is occupied by an enemy, that piece is captured.
 * If the target is on the board edge, normal capture occurs.
 */
export class BouncerDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    readonly priority = 1; // Run after basic movement validation but before other effects

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

        const bounceSquare = ev.target.position.add(step);
        const inBounds = state.board.isInBounds(bounceSquare);
        if (!inBounds) {
            return EventSequences.Continue as EventSequence;
        }

        const bouncePiece = state.board.getPieceAt(bounceSquare);
        if (this.isFriendly(bouncePiece)) {
            return EventSequences.Continue as EventSequence;
        }

        const events = this.buildBounceEvents(ev, bounceSquare, bouncePiece);
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

    private buildBounceEvents(ev: CaptureEvent, bounceSquare: Vector2Int, bouncePiece: Piece | null): GameEvent[] {
        const attacker = ev.attacker;
        const target = ev.target;
        if (!attacker) return [];
        
        const events: GameEvent[] = [];
        
        // If there's a piece at the bounce square, destroy it first
        if (bouncePiece) {
            events.push(new DestroyEvent(bouncePiece, "Bounced into", ev.actor, this.id));
        }
        
        // Move the captured piece to the bounce square
        events.push(new MoveEvent(target.position, bounceSquare, target, ev.actor, false, this.id));
        
        // Move the attacker to the target's original position
        events.push(new MoveEvent(attacker.position, ev.target.position, attacker, ev.actor, ev.isPlayerAction, this.id));
        
        return events;
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new BouncerDecorator(inner, this.id);
    }
}
