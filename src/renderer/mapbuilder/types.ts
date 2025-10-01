import { DecoratorId, PieceId, TileId } from "../../shared/entityRegistry";

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
