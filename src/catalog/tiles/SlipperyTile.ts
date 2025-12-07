import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";

/**
 * Forces a piece to slide one extra step in its movement direction on entering.
 */
export class SlipperyTile extends BaseTile {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new SlipperyTile(this.position, this.id);
    }

    protected onPieceEntered(ctx: ListenerContext, event: MoveEvent): GameEvent[] {
        const dir = new Vector2Int(event.to.x - event.from.x, event.to.y - event.from.y);
        const step = new Vector2Int(Math.sign(dir.x), Math.sign(dir.y));
        const next = event.to.add(step);

        if (!ctx.state.board.isInBounds(next) || ctx.state.board.getPieceAt(next)) {
            return [];
        }

        // Get the piece from the updated state at its new position
        const movedPiece = ctx.state.board.getPieceAt(event.to);
        if (!movedPiece) return [];

        // Generate slide move
        const slide = new MoveEvent(
            event.to,
            next,
            movedPiece,
            event.actor,
            event.isPlayerAction,
            this.id
        );

        return [slide];
    }
}



