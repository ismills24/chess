import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { MovementRestrictions } from "../../chess-engine";
import { GameState } from "../../chess-engine/state/GameState";
import { ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";

/**
 * Base class for tiles providing ID and position.
 */
export abstract class BaseTile implements Tile {
    readonly id: string;
    position: Vector2Int;

    protected constructor(position?: Vector2Int, id?: string) {
        this.id = id ?? this.generateDescriptiveId();
        this.position = position ?? new Vector2Int(0, 0);
    }

    /**
     * Subclasses must override clone() to return a deep copy.
     */
    abstract clone(): Tile;

    public getRestrictedSquares(state: GameState): MovementRestrictions | null {
        return null;
    }

    /**
     * Convenience hook for tiles that want to react after a piece finishes
     * moving onto this tile. Subclasses can override onPieceEntered instead of
     * wiring their own onAfterEvent handlers.
     */
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        if (event instanceof MoveEvent && event.to.equals(this.position)) {
            const result = this.onPieceEntered(ctx, event);
            return result || [];
        }
        return [];
    }

    /**
     * Optional tile-specific handler invoked when a MoveEvent lands on this
     * tile (post-application). Override to emit follow-up events.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPieceEntered(ctx: ListenerContext, event: MoveEvent): GameEvent[] {
        return [];
    }

    protected generateDescriptiveId(): string {
        const className = this.constructor.name.replace('Tile', '').toLowerCase();
        const uuid = crypto.randomUUID().substring(0, 8);
        return `${className}-${uuid}`;
    }
}



