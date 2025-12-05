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
        if (!event.isPlayerAction){ 
            return event;
        }
        if (!this.isOurCapture(event, ctx.state)) {
            return event;
        }
        

        // Calculate landing square: one step beyond target in the same direction
        // Get unit direction vector from attacker to target
        const unitStep = this.computeUnitStep(event.attacker, event.target);
        if (!unitStep) {
            return event;
        }
        // Landing square is one step beyond the target
        const landingSquare = event.target.position.add(unitStep);
        const inBounds = ctx.state.board.isInBounds(landingSquare);
        if (!inBounds) {
            return event;
        }

        const landingPiece = ctx.state.board.getPieceAt(landingSquare);
        if (this.isFriendly(landingPiece)) {
            return event;
        }

        // Replace capture with pierce sequence: jump over target (leave it untouched) and capture landing piece
        const events: GameEvent[] = [];
        // Get pieces from state to ensure fresh references
        const attackerFromState = ctx.state.board.getPieceAt(event.attacker.position);
        if (!attackerFromState) {
            return event;
        }
        
        // If there's an enemy piece on the landing square, capture it first
        if (landingPiece && landingPiece.owner !== this.inner.owner) {
            const landingFromState = ctx.state.board.getPieceAt(landingSquare);
            if (landingFromState) {
                // Create capture event for the landing piece
                // Set isPlayerAction to false so we don't recursively intercept it
                events.push(new CaptureEvent(attackerFromState, landingFromState, event.actor, false));
            }
        }
        
        // Move attacker to landing square (jumps over the first target, leaving it untouched)
        events.push(new MoveEvent(attackerFromState.position, landingSquare, attackerFromState, event.actor, event.isPlayerAction, this.id));
        
        return events; // Return array to cancel original capture and enqueue new events
    }

    private isOurCapture(ev: CaptureEvent, state: GameState): boolean {
        if (!ev.attacker) return false;
        
        // Check if this ability is in the attacker's ability chain
        // The attacker in the event is the piece from the board when the event was created
        let current: any = ev.attacker;
        while (current) {
            if (current.id === this.id) {
                return true;
            }
            // Check if this is an ability wrapper (has innerPiece property)
            if (current.innerPiece) {
                current = current.innerPiece;
            } else {
                break;
            }
        }
        
        return false;
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

