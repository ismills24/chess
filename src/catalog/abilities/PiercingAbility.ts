import { AbilityBase } from "./AbilityBase";
import { Piece as CatalogPiece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, DestroyEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { Piece as StatePiece } from "../../chess-engine/state/types";

/**
 * Makes the piece jump over its target instead of capturing it.
 * The piece lands on the square directly behind the target and captures whatever is there.
 * If the target is on the board edge, normal capture occurs.
 */
export class PiercingAbility extends AbilityBase implements Listener {
    readonly priority = 1; // Run after basic movement validation but before other effects
    protected readonly abilityValue = 3;

    constructor(inner: CatalogPiece, id?: string) {
        super(inner, id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        if (!(event instanceof CaptureEvent)) return event;
        if (!event.isPlayerAction) return event;
        if (!this.isOurCapture(event, ctx.state)) {
            return event;
        }

        // Calculate landing square: same distance beyond target as attacker was from target
        // landing = target + (target - attacker) = 2*target - attacker
        const dx = event.target.position.x - event.attacker.position.x;
        const dy = event.target.position.y - event.attacker.position.y;
        const landingSquare = new Vector2Int(
            event.target.position.x + dx,
            event.target.position.y + dy
        );
        const inBounds = ctx.state.board.isInBounds(landingSquare);
        if (!inBounds) {
            return event;
        }

        const landingPiece = ctx.state.board.getPieceAt(landingSquare);
        if (this.isFriendly(landingPiece)) {
            return event;
        }

        // Replace capture with pierce sequence: destroy target + destroy landing piece (if exists) + move attacker
        const events: GameEvent[] = [];
        // Get pieces from state to ensure fresh references
        const targetFromState = ctx.state.board.getPieceAt(event.target.position);
        const attackerFromState = ctx.state.board.getPieceAt(event.attacker.position);
        if (!targetFromState || !attackerFromState) {
            console.log(`[PiercingAbility] Missing pieces: target=${!!targetFromState}, attacker=${!!attackerFromState}`);
            return event;
        }
        
        console.log(`[PiercingAbility] Creating pierce sequence: attacker at ${event.attacker.position.toString()}, target at ${event.target.position.toString()}, landing at ${landingSquare.toString()} (dx=${dx}, dy=${dy})`);
        
        // Destroy the target (pierced through) - must be explicit since we're replacing the CaptureEvent
        events.push(new DestroyEvent(targetFromState, "Pierced through", event.actor, this.id));
        // Destroy landing piece if it exists (do this before moving attacker)
        if (landingPiece) {
            const landingFromState = ctx.state.board.getPieceAt(landingSquare);
            if (landingFromState) {
                events.push(new DestroyEvent(landingFromState, "Pierced", event.actor, this.id));
            }
        }
        // Move attacker to landing square - use current position from state (not event, which might be stale)
        events.push(new MoveEvent(attackerFromState.position, landingSquare, attackerFromState, event.actor, event.isPlayerAction, this.id));
        
        console.log(`[PiercingAbility] Returning ${events.length} events: ${events.map(e => e.constructor.name).join(', ')}`);
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
        return new PiercingAbility(inner, this.id);
    }
}

