import { Tile } from "./Tile";
import { Vector2Int } from "../primitives/Vector2Int";

/**
 * Base class for tiles providing ID and position.
 */
export abstract class BaseTile implements Tile {
    readonly id: string;
    position: Vector2Int;

    protected constructor(position?: Vector2Int, id?: string) {
        this.id = id ?? crypto.randomUUID();
        this.position = position ?? new Vector2Int(0, 0);
    }

    /**
     * Subclasses must override clone() to return a deep copy.
     */
    abstract clone(): Tile;
}
