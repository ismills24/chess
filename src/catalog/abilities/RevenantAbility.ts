import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, DestroyEvent, CaptureEvent, TileChangedEvent } from "../../chess-engine/events/EventRegistry";
import { TombTile } from "../tiles/TombTile";

/**
 * On death, leave behind a tomb that can later resurrect this piece.
 */
export class RevenantAbility extends AbilityBase implements Listener {
    readonly priority = 1; // after basic prevention tiles but before late effects
    protected readonly abilityValue = 3;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Trigger on this piece's death (capture or destroy)
        const deathTarget =
            event instanceof DestroyEvent ? event.target :
            event instanceof CaptureEvent ? event.target :
            null;

        if (!deathTarget || deathTarget.id !== this.id) return [];
        if (event.sourceId === this.id) return []; // avoid loops

        const deathPos = deathTarget.position;

        // Current tile at the death position
        const currentTile = ctx.state.board.getTile(deathPos);
        if (!currentTile) return [];

        const tombTile = new TombTile(this.clone(), deathPos);

        return [
            new TileChangedEvent(
                deathPos,
                currentTile,
                tombTile,
                event.actor,
                "revenant-tomb"
            ),
        ];
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new RevenantAbility(inner, this.id);
    }
}


