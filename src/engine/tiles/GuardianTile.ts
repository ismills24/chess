import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../primitives/Vector2Int";
import { GameState } from "../state/GameState";
import { CaptureEvent, MoveEvent, TileChangedEvent } from "../events/GameEvent";
import { EventSequence } from "../events/EventSequence";
import { EventSequences } from "../events/EventSequences";
import { Interceptor } from "../events/Interceptor";
import { StandardTile } from "./StandardTile";

/**
 * A GuardianTile protects the piece standing on it once.
 * - If a capture targets the occupant, the capture is cancelled,
 *   the tile is consumed (replaced with Standard), and the turn ends.
 * - If a move would land onto this tile while occupied, the move is cancelled,
 *   the tile is consumed, and the turn ends.
 * After triggering once, the tile becomes a StandardTile.
 */
export class GuardianTile extends BaseTile implements Interceptor<CaptureEvent>, Interceptor<MoveEvent> {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new GuardianTile(this.position, this.id);
    }

    intercept(ev: CaptureEvent | MoveEvent, state: GameState): EventSequence {
        if (ev instanceof CaptureEvent) {
            if (!ev.target.position.equals(this.position)) return EventSequences.Continue as EventSequence;

            const consumeTile = new TileChangedEvent(this.position, new StandardTile(this.position), ev.actor);
            return new EventSequence([consumeTile], "AbortChain" as any);
        }

        if (ev instanceof MoveEvent) {
            if (!ev.to.equals(this.position)) return EventSequences.Continue as EventSequence;

            const occupant = state.board.getPieceAt(this.position);
            if (!occupant) return EventSequences.Continue as EventSequence;

            const consumeTile = new TileChangedEvent(this.position, new StandardTile(this.position), ev.actor);
            return new EventSequence([consumeTile], "AbortChain" as any);
        }

        return EventSequences.Continue as EventSequence;
    }
}
