import { Tile } from "./Tile";
import { Vector2Int } from "../primitives/Vector2Int";
import { MovementRestrictions } from "../pieces/MovementHelper";
import { GameState } from "../state/GameState";

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

    public getRestrictedSquares(state: GameState): MovementRestrictions {
        return null;
    }

    protected generateDescriptiveId(): string {
        const className = this.constructor.name.replace('Tile', '').toLowerCase();
        const uuid = crypto.randomUUID().substring(0, 8); // Use first 8 chars for uniqueness
        return `${className}-${uuid}`;
    }
}
