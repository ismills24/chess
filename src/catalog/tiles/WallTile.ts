import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState, MovementRestrictions } from "src/chess-engine";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent, TileChangedEvent } from "../../chess-engine/events/EventRegistry";
import { StandardTile } from "./StandardTile";

/**
 * A standard tile with no special effects.
 * This is the default tile type for most board positions.
 */
export class WallTile extends BaseTile implements Listener {
    readonly priority = 0;
    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    getRestrictedSquares(_: GameState): MovementRestrictions | null {
        return {
            restrictedSquares: [{
                square: this.position,
                type: "obstacle",
            }],
            sourceId: this.id,
        };
    }

    clone(): Tile {
        return new WallTile(this.position, this.id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        if (!(event instanceof MoveEvent)) return event;
        if (!event.to.equals(this.position)) return event;

        const currentTile = ctx.state.board.getTile(this.position);
        if (!currentTile || currentTile.id !== this.id) return event;

        // Cancel the move and consume the wall (replace with StandardTile)
        return new TileChangedEvent(
            this.position,
            currentTile,
            new StandardTile(this.position),
            event.actor,
            "wall-consumed"
        );
    }
}



