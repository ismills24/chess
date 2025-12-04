import { AbilityId, PieceId, TileId } from "../../catalog/registry/Catalog";

// Legacy type alias for backward compatibility with map files
export type DecoratorId = AbilityId;

export type Color = "White" | "Black";

export interface PlacedPiece {
    type: PieceId;
    color: Color;
    x: number;
    y: number;
    decorators: DecoratorId[];
}

export interface PlacedTile {
    type: TileId;
    x: number;
    y: number;
}

export interface MapDefinition {
    width: number;
    height: number;
    startingPlayer: Color;
    pieces: PlacedPiece[];
    tiles: PlacedTile[];
}
