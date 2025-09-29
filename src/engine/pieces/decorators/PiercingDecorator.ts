import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { MoveEvent, CaptureEvent, GameEvent } from "../../events/GameEvent";
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

    constructor(inner: Piece, id?: string) {
        super(inner, id);
        console.log(`[PiercingDecorator] ===== CONSTRUCTOR CALLED =====`);
        console.log(`[PiercingDecorator] Created decorator with ID: ${this.id} for piece: ${inner.name}`);
        console.log(`[PiercingDecorator] Inner piece ID: ${inner.id}`);
        console.log(`[PiercingDecorator] Priority: ${this.priority}`);
        console.log(`[PiercingDecorator] Has intercept method: ${typeof this.intercept === 'function'}`);
    }

    intercept(ev: CaptureEvent, state: GameState): EventSequence {
        console.log(`[PiercingDecorator] ===== INTERCEPT CALLED =====`);
        console.log(`[PiercingDecorator] Event type: ${ev.constructor.name}`);
        console.log(`[PiercingDecorator] Event attacker ID: ${ev.attacker?.id}`);
        console.log(`[PiercingDecorator] Event attacker name: ${ev.attacker?.name}`);
        console.log(`[PiercingDecorator] Event target ID: ${ev.target?.id}`);
        console.log(`[PiercingDecorator] Event target name: ${ev.target?.name}`);
        console.log(`[PiercingDecorator] Event source ID: ${ev.sourceId}`);
        console.log(`[PiercingDecorator] Event isPlayerAction: ${ev.isPlayerAction}`);
        console.log(`[PiercingDecorator] My decorator ID: ${this.id}`);
        console.log(`[PiercingDecorator] My inner piece ID: ${this.inner.id}`);
        console.log(`[PiercingDecorator] My inner piece name: ${this.inner.name}`);
        console.log(`[PiercingDecorator] My inner piece position: ${this.inner.position.toString()}`);
        
        // Only handle CaptureEvents
        if (!(ev instanceof CaptureEvent)) {
            console.log(`[PiercingDecorator] ❌ Not a CaptureEvent, continuing`);
            return EventSequences.Continue as EventSequence;
        }

        // If this capture was already emitted by us, ignore it to prevent recursion
        if (ev.sourceId === this.id) {
            console.log(`[PiercingDecorator] ❌ Event from us (sourceId match), continuing`);
            return EventSequences.Continue as EventSequence;
        }

        // Only trigger when this piece is the attacker
        console.log(`[PiercingDecorator] Checking attacker ID: ${ev.attacker.id} === ${this.inner.id} ?`);
        if (ev.attacker.id !== this.inner.id) {
            console.log(`[PiercingDecorator] ❌ Not our attacker (ID mismatch), continuing`);
            return EventSequences.Continue as EventSequence;
        }

        // Only intercept player actions (not moves from other effects)
        if (!ev.isPlayerAction) {
            console.log(`[PiercingDecorator] ❌ Not a player action, continuing`);
            return EventSequences.Continue as EventSequence;
        }

        console.log(`[PiercingDecorator] ✅ All checks passed! Processing piercing logic...`);

        const target = ev.target;
        const attacker = ev.attacker;

        console.log(`[PiercingDecorator] Target position: ${target.position.toString()}`);
        console.log(`[PiercingDecorator] Attacker position: ${attacker.position.toString()}`);

        // Calculate the direction of movement (from attacker to target)
        const direction = new Vector2Int(target.position.x - attacker.position.x, target.position.y - attacker.position.y);
        const step = new Vector2Int(Math.sign(direction.x), Math.sign(direction.y));
        
        console.log(`[PiercingDecorator] Direction vector: ${direction.toString()}`);
        console.log(`[PiercingDecorator] Step vector: ${step.toString()}`);
        
        // Calculate landing square (target position + direction)
        const landingSquare = target.position.add(step);
        console.log(`[PiercingDecorator] Landing square: ${landingSquare.toString()}`);

        // Check if we can jump over (landing square must be within bounds)
        const isInBounds = state.board.isInBounds(landingSquare);
        console.log(`[PiercingDecorator] Landing square in bounds: ${isInBounds}`);
        
        if (!isInBounds) {
            console.log(`[PiercingDecorator] ❌ Target on board edge, normal capture`);
            return EventSequences.Continue as EventSequence;
        }

        // Check if landing square has a piece we can capture
        const landingPiece = state.board.getPieceAt(landingSquare);
        console.log(`[PiercingDecorator] Landing square piece: ${landingPiece ? landingPiece.name : 'empty'}`);
        console.log(`[PiercingDecorator] Landing piece owner: ${landingPiece ? landingPiece.owner : 'N/A'}`);
        console.log(`[PiercingDecorator] My owner: ${this.inner.owner}`);
        
        // Don't capture friendly pieces
        if (landingPiece && landingPiece.owner === this.inner.owner) {
            console.log(`[PiercingDecorator] ❌ Friendly piece on landing square, normal capture`);
            return EventSequences.Continue as EventSequence;
        }

        console.log(`[PiercingDecorator] ✅ ${this.inner.name} jumps over ${target.name} to ${landingSquare.toString()}`);

        // Create new event sequence:
        // 1. Move to landing square (jumping over target)
        // 2. Capture piece on landing square (if exists)
        const events: GameEvent[] = [
            new MoveEvent(attacker.position, landingSquare, attacker, ev.actor, ev.isPlayerAction, this.id)
        ];

        if (landingPiece) {
            console.log(`[PiercingDecorator] Adding capture event for ${landingPiece.name}`);
            events.push(new CaptureEvent(attacker, landingPiece, ev.actor, ev.isPlayerAction));
        } else {
            console.log(`[PiercingDecorator] No piece to capture on landing square`);
        }

        console.log(`[PiercingDecorator] Created ${events.length} events, using AbortChain`);
        return new EventSequence(events, FallbackPolicy.AbortChain);
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new PiercingDecorator(inner, this.id);
    }

    // Test method to verify decorator is working
    testDecorator(): string {
        console.log(`[PiercingDecorator] TEST METHOD CALLED!`);
        return `PiercingDecorator is working! ID: ${this.id}, Inner: ${this.inner.name}`;
    }
}
