import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, DestroyEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { PlayerColor } from "src/chess-engine";

/**
 * When destroyed, explodes and destroys all adjacent pieces.
 */
export class ExplodingAbility extends AbilityBase implements Listener {
    // Run after Marksman (which defaults to 0) so ranged kills happen first
    readonly priority = 1;
    protected readonly abilityValue = 2;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        // Only care about CaptureEvent targeting this exploding piece
        if (!(event instanceof CaptureEvent)) return event;
        
        const target = event.target;
        if (!target || target.id !== this.id) return event;
        if (event.sourceId === this.id) return event; // Avoid self-loops

        // If a player tried to capture this exploding piece via a normal move,
        // recreate the move first so the attacker ends up on the target square,
        // then explode (which will also destroy the attacker if adjacent).
        if (event.isPlayerAction) {
            const from = event.attacker.position;
            const to = event.target.position;
            const moveFirst = new MoveEvent(from, to, event.attacker, event.actor, true, this.id);
            const explode = this.buildExplosionEvents(event.actor, ctx.state, to);
            // Return array to replace the original CaptureEvent with MoveEvent + explosion events
            return [moveFirst, ...explode];
        }

        // Non-player capture affecting this piece → just explode; do not force movement
        const explode = this.buildExplosionEvents(event.actor, ctx.state, target.position);
        // Return array to replace the original CaptureEvent with explosion events
        return explode;
    }

    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Handle DestroyEvent targeting this piece (e.g., ranged marksman kill) → just explode
        if (!(event instanceof DestroyEvent)) return [];

        const target = event.target;
        if (!target || target.id !== this.id) return [];
        if (event.sourceId === this.id) return []; // Avoid self-loops

        // Build explosion events for adjacent pieces
        // Use the target's position from the event (before it was removed)
        const explosionPos = target.position;
        return this.buildExplosionEvents(event.actor, ctx.state, explosionPos);
    }

    private buildExplosionEvents(actor: PlayerColor, state: GameState, explosionPos: Vector2Int): GameEvent[] {
        const events: GameEvent[] = [];
        const offsets = [
            new Vector2Int(-1, -1), new Vector2Int(0, -1), new Vector2Int(1, -1),
            new Vector2Int(-1, 0), new Vector2Int(1, 0),
            new Vector2Int(-1, 1), new Vector2Int(0, 1), new Vector2Int(1, 1),
        ];

        // Get the exploding piece from state (it should still be there for onBeforeEvent)
        const explodingPiece = state.board.getPieceAt(explosionPos);
        if (explodingPiece && explodingPiece.id === this.id) {
            // Include destroy event for the exploding piece itself
            events.push(new DestroyEvent(explodingPiece, "Exploded", actor, this.id));
        }

        // Use the explosion position (where the piece was when it exploded)
        for (const off of offsets) {
            const pos = explosionPos.add(off);
            if (!state.board.isInBounds(pos)) continue;

            const occupant = state.board.getPieceAt(pos);
            if (occupant) {
                events.push(new DestroyEvent(occupant, "Exploded by neighbor", actor, this.id));
            }
        }

        return events;
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new ExplodingAbility(inner, this.id);
    }
}

