import { AbilityBase } from "./AbilityBase";
import { Piece as CatalogPiece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, DestroyEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";

/**
 * Sacrifices itself if an adjacent friendly piece would be captured.
 * Cancels the capture, destroys self, and saves ally.
 */
export class ScapegoatAbility extends AbilityBase implements Listener {
    readonly priority = 0;
    protected readonly abilityValue = 1;

    constructor(inner: CatalogPiece, id?: string) {
        super(inner, id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        // Only handle Capture/Destroy
        if (!(event instanceof CaptureEvent) && !(event instanceof DestroyEvent)) {
            return event;
        }

        // Avoid intercepting our own emitted self-destruction
        if (event.sourceId === this.id) {
            console.log(`[ScapegoatAbility] Ignoring own event from ${this.id}`);
            return event;
        }

        const target = event instanceof CaptureEvent ? event.target : event.target;
        if (!target) {
            console.log(`[ScapegoatAbility] No target in event`);
            return event;
        }

        // Get scapegoat's current position from state (may have moved)
        const selfFromState = ctx.state.board.getPieceAt(this.inner.position);
        if (!selfFromState || selfFromState.id !== this.id) {
            console.log(`[ScapegoatAbility] Self not found at ${this.inner.position.toString()}, id=${this.id}`);
            return event;
        }
        
        const isAdjacent = this.isAdjacent(target.position, selfFromState.position);
        console.log(`[ScapegoatAbility] Checking protection: target at ${target.position.toString()}, self at ${selfFromState.position.toString()}, adjacent=${isAdjacent}, sameOwner=${target.owner === this.inner.owner}, targetId=${target.id}, selfId=${this.id}`);
        
        // Protect adjacent friendly (from capture or explosion) by sacrificing self
        if (target.id !== this.id && target.owner === this.inner.owner && isAdjacent) {
            console.log(`[ScapegoatAbility] PROTECTING adjacent friendly!`);
            // Cancel the original event and generate self-destruction
            // Return array to cancel original CaptureEvent and enqueue self-destruction
            // EventQueue will automatically cancel the associated MoveEvent if this was a CaptureEvent
            return [new DestroyEvent(selfFromState, "Died protecting ally", event.actor, this.id)];
        }

        console.log(`[ScapegoatAbility] NOT protecting (not adjacent or different owner)`);
        return event;
    }

    private isAdjacent(a: Vector2Int, b: Vector2Int): boolean {
        return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && !(a.x === b.x && a.y === b.y);
    }

    protected createAbilityClone(inner: CatalogPiece): CatalogPiece {
        return new ScapegoatAbility(inner, this.id);
    }
}

