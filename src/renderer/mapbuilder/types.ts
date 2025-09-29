export type Color = "White" | "Black";

export type PieceId = "Pawn" | "Knight" | "Bishop" | "Rook" | "Queen" | "King";
export type DecoratorId = "Marksman" | "Exploding" | "Scapegoat";
export type TileId = "StandardTile" | "GuardianTile" | "SlipperyTile";

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
