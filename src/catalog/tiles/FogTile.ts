import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { MovementRestrictions } from "../../chess-engine/rules/MovementPatterns";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent } from "../../chess-engine/events/EventRegistry";

/**
 * Fog tiles conceal the occupying piece from captures.
 * - Prevents enemy captures on the piece standing on the tile.
 * - Advertises the tile itself as restricted for all pieces via movement restrictions.
 */
export class FogTile extends BaseTile implements Listener {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new FogTile(this.position, this.id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        // Cancel capture events targeting piece on this tile
        if (event instanceof CaptureEvent) {
            if (event.target.position.equals(this.position)) {
                // Cancel the capture - piece is concealed
                return null;
            }
        }
        return event;
    }

    getRestrictedSquares(state: GameState): MovementRestrictions | null {
        if (!this.position) return null;
        if (!state.board.getPieceAt(this.position)) return null;
        return {
            restrictedSquares: [this.position],
            sourceId: this.id,
        };
    }
}

