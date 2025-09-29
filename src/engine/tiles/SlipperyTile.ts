import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../primitives/Vector2Int";
import { GameState } from "../state/GameState";
import { MoveEvent } from "../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../events/EventSequence";
import { EventSequences } from "../events/EventSequences";
import { Interceptor } from "../events/Interceptor";

/**
 * Forces a piece to slide one extra step in its movement direction on entering.
 */
export class SlipperyTile extends BaseTile implements Interceptor<MoveEvent> {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new SlipperyTile(this.position, this.id);
    }

    intercept(ev: MoveEvent | any, state: GameState): EventSequence {
        // Only handle MoveEvents. Other events (Capture/Destroy/etc.) also reach tiles via the pipeline.
        if (!(ev instanceof MoveEvent)) return EventSequences.Continue as EventSequence;

        // If this move was already emitted by us, ignore it to prevent recursion.
        if (ev.sourceId === this.id) return EventSequences.Continue as EventSequence;

        // Only trigger when the piece lands on this tile.
        if (!ev.to || !ev.to.equals(this.position)) return EventSequences.Continue as EventSequence;

        const dir = new Vector2Int(ev.to.x - ev.from.x, ev.to.y - ev.from.y);
        const step = new Vector2Int(Math.sign(dir.x), Math.sign(dir.y));
        const next = ev.to.add(step);

        if (!state.board.isInBounds(next) || state.board.getPieceAt(next)) {
            return EventSequences.Continue as EventSequence;
        }

        console.log(`[SlipperyTile] ${ev.piece.name} slides ${ev.to.toString()} → ${next.toString()}`);
        console.log(`[Incoming Move ID] ${ev.sourceId} and my id is ${this.id}`);

        const slide = new MoveEvent(ev.to, next, ev.piece, ev.actor, ev.isPlayerAction, this.id);
        const processedMove = new MoveEvent(ev.from, ev.to, ev.piece, ev.actor, ev.isPlayerAction, this.id);

        return new EventSequence([processedMove, slide], FallbackPolicy.ContinueChain);
    }
}
