import { AbilityBase } from "./AbilityBase";
import { Piece as CatalogPiece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, DestroyEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { Piece as StatePiece } from "../../chess-engine/state/types";

/**
 * Makes the piece bounce captured enemies backward from the direction it came from.
 * The captured piece is moved to the square behind it (from the attacker's perspective),
 * and the attacker moves to the target's original position.
 * If the bounce square is occupied by an enemy, that piece is captured.
 * If the target is on the board edge, normal capture occurs.
 */
export class BouncerAbility extends AbilityBase implements Listener {
    readonly priority = 1; // Run after basic movement validation but before other effects
    protected readonly abilityValue = 1;

    constructor(inner: CatalogPiece, id?: string) {
        super(inner, id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        if (!(event instanceof CaptureEvent)) return event;
        if (!event.isPlayerAction) return event;
        if (!this.isOurCapture(event, ctx.state)) {
            return event;
        }

        // Calculate bounce square: same distance beyond target as attacker was from target
        // bounce = target + (target - attacker) = 2*target - attacker
        const dx = event.target.position.x - event.attacker.position.x;
        const dy = event.target.position.y - event.attacker.position.y;
        const bounceSquare = new Vector2Int(
            event.target.position.x + dx,
            event.target.position.y + dy
        );
        const inBounds = ctx.state.board.isInBounds(bounceSquare);
        if (!inBounds) {
            return event;
        }

        const bouncePiece = ctx.state.board.getPieceAt(bounceSquare);
        if (this.isFriendly(bouncePiece)) {
            return event;
        }

        // Replace capture with bounce sequence
        const events: GameEvent[] = [];
        
        // Get pieces from state to ensure fresh references
        const targetFromState = ctx.state.board.getPieceAt(event.target.position);
        const attackerFromState = ctx.state.board.getPieceAt(event.attacker.position);
        if (!targetFromState || !attackerFromState) return event;
        
        // If there's a piece at the bounce square, destroy it first (before moving target)
        if (bouncePiece) {
            const bounceFromState = ctx.state.board.getPieceAt(bounceSquare);
            if (bounceFromState) {
                events.push(new DestroyEvent(bounceFromState, "Bounced into", event.actor, this.id));
            }
        }
        
        // Move the captured piece to the bounce square (after destroying any piece there)
        events.push(new MoveEvent(targetFromState.position, bounceSquare, targetFromState, event.actor, false, this.id));
        
        // Move the attacker to the target's original position
        events.push(new MoveEvent(attackerFromState.position, event.target.position, attackerFromState, event.actor, event.isPlayerAction, this.id));
        
        return events; // Return array to cancel original and enqueue all new events
    }

    private isOurCapture(ev: CaptureEvent, state: GameState): boolean {
        if (!ev.attacker) return false;
        const attackerAtPos = state.board.getPieceAt(ev.attacker.position);
        return attackerAtPos?.id === this.id;
    }

    private computeUnitStep(attacker: StatePiece, target: StatePiece): Vector2Int | null {
        const dx = Math.sign(target.position.x - attacker.position.x);
        const dy = Math.sign(target.position.y - attacker.position.y);
        if (dx === 0 && dy === 0) return null;
        return new Vector2Int(dx, dy);
    }

    private isFriendly(piece: StatePiece | null): boolean {
        return !!piece && piece.owner === this.inner.owner;
    }

    protected createAbilityClone(inner: CatalogPiece): CatalogPiece {
        return new BouncerAbility(inner, this.id);
    }
}

