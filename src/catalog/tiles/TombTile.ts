import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent, TileChangedEvent, PiecePlacedEvent } from "../../chess-engine/events/EventRegistry";
import { StandardTile } from "./StandardTile";
import { Piece } from "../../chess-engine/state/types";

/**
 * TombTile stores an entombed piece and restores it when an ally steps on it.
 * - Trigger: A MoveEvent landing on this tile by a piece with the same owner as the entombed piece.
 * - Effect: Cancel the move, place the entombed piece on this square, and replace the tile with StandardTile.
 * - The moving piece remains at its original position because the MoveEvent is replaced/cancelled.
 */
export class TombTile extends BaseTile implements Listener {
    readonly priority = 0;
    private readonly entombed: Piece;

    constructor(entombed: Piece, position?: Vector2Int, id?: string) {
        super(position, id);
        this.entombed = entombed.clone(); // store a clone to preserve immutability
        this.entombed.position = position ?? this.entombed.position;
    }

    clone(): Tile {
        return new TombTile(this.entombed.clone(), this.position, this.id);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | GameEvent[] | null {
        if (!(event instanceof MoveEvent)) return event;
        if (!event.to.equals(this.position)) return event;

        // Only trigger for friendly pieces
        if (event.piece.owner !== this.entombed.owner) return event;

        // Ensure tile is still this tomb
        const currentTile = ctx.state.board.getTile(this.position);
        if (!currentTile || currentTile.id !== this.id) return event;

        // Only restore if destination is empty
        if (ctx.state.board.getPieceAt(this.position)) return event;

        // Replace the move with placing the entombed piece and consuming the tile
        return [
            new PiecePlacedEvent(this.entombed.clone(), this.position, event.actor, this.id, "tomb-restore"),
            new TileChangedEvent(this.position, currentTile, new StandardTile(this.position), event.actor, "tomb-cleared"),
        ];
    }
}


