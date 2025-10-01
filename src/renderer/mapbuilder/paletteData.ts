import {
    DECORATOR_IDS,
    DecoratorId,
    iconForDecorator,
    iconForPiece,
    iconForTile,
    PIECE_IDS,
    PieceId,
    TILE_IDS,
    TileId,
} from "../../shared/entityRegistry";

export const PIECES: PieceId[] = [...PIECE_IDS];
export const DECORATORS: DecoratorId[] = [...DECORATOR_IDS];
export const TILES: TileId[] = [...TILE_IDS];

export { iconForPiece, iconForDecorator, iconForTile };
