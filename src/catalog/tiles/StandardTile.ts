import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";

/**
 * A standard tile with no special effects.
 * This is the default tile type for most board positions.
 */
export class StandardTile extends BaseTile {
    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    clone(): Tile {
        return new StandardTile(this.position, this.id);
    }
}



