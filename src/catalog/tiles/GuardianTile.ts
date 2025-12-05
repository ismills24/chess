import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, MoveEvent, TileChangedEvent } from "../../chess-engine/events/EventRegistry";
import { StandardTile } from "./StandardTile";

/**
 * A GuardianTile protects the piece standing on it once.
 * - If a capture targets the occupant, the capture is cancelled,
 *   the tile is consumed (replaced with Standard), and the turn ends.
 * - If a move would land onto this tile while occupied, the move is cancelled,
 *   the tile is consumed, and the turn ends.
 * After triggering once, the tile becomes a StandardTile.
 */
export class GuardianTile extends BaseTile implements Listener {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new GuardianTile(this.position, this.id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        // Cancel capture events targeting piece on this tile
        // Consume the guardian tile
        if (event instanceof CaptureEvent) {
            if (event.target.position.equals(this.position)) {
                // Get current tile from state to ensure we have the right reference
                const currentTile = ctx.state.board.getTile(this.position);
                if (!currentTile || currentTile.id !== this.id) {
                    // Tile has already been changed, don't process
                    return event;
                }
                // Cancel capture and consume tile
                return new TileChangedEvent(
                    this.position,
                    currentTile,
                    new StandardTile(this.position),
                    event.actor
                );
            }
        }

        // Cancel move events that would land on occupied guardian tile
        // Consume the guardian tile
        if (event instanceof MoveEvent) {
            if (!event.to.equals(this.position)) return event;

            const occupant = ctx.state.board.getPieceAt(this.position);
            if (!occupant) return event;

            // Get current tile from state to ensure we have the right reference
            const currentTile = ctx.state.board.getTile(this.position);
            if (!currentTile || currentTile.id !== this.id) {
                // Tile has already been changed, don't process
                return event;
            }

            // Cancel move and consume tile
            return new TileChangedEvent(
                this.position,
                currentTile,
                new StandardTile(this.position),
                event.actor
            );
        }

        return event;
    }
}

