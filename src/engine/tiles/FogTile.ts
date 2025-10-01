import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../primitives/Vector2Int";
import { GameState } from "../state/GameState";
import { MovementRestrictions } from "../pieces/MovementHelper";
import { Interceptor } from "../events/Interceptor";
import { CaptureEvent, MoveEvent } from "../events/GameEvent";
import { EventSequence, EventSequenceLike, FallbackPolicy } from "../events/EventSequence";
import { EventSequences } from "../events/EventSequences";
import { PlayerColor } from "../primitives/PlayerColor";
import { PieceDecoratorBase } from "../pieces/decorators/PieceDecoratorBase";

/**
 * Fog tiles conceal the occupying piece from captures.
 * - Prevents enemy captures on the piece standing on the tile.
 * - Advertises the tile itself as restricted for all pieces via movement restrictions.
 */
export class FogTile extends BaseTile implements Interceptor<MoveEvent> {
    readonly priority = 0;

    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }
    intercept(ev: MoveEvent, state: GameState): EventSequenceLike {
        return EventSequences.Continue as EventSequence;
    }

    clone(): Tile {
        return new FogTile(this.position, this.id);
    }

    getRestrictedSquares(state: GameState): MovementRestrictions {
        if (!this.position) return null;
        if(!state.board.getPieceAt(this.position)) return null;
        return {
            restrictedSquares: [this.position],
            sourceId: this.id,
        };
    }
}

