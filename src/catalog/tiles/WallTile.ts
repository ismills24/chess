import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState, MovementRestrictions } from "src/chess-engine";

/**
 * A standard tile with no special effects.
 * This is the default tile type for most board positions.
 */
export class WallTile extends BaseTile {
    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }

    getRestrictedSquares(_: GameState): MovementRestrictions | null {
        return {
            restrictedSquares: [{
                square: this.position,
                type: "obstacle",
            }],
            sourceId: this.id,
        };
    }

    clone(): Tile {
        return new WallTile(this.position, this.id);
    }
}



