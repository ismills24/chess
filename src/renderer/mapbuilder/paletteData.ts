import {
    ABILITY_IDS,
    AbilityId,
    iconForAbility,
    iconForPiece,
    iconForTile,
    PIECE_IDS,
    PieceId,
    TILE_IDS,
    TileId,
} from "../../catalog/registry/Catalog";

// Export using Catalog (new system)
export const PIECES: PieceId[] = [...PIECE_IDS];
export const TILES: TileId[] = [...TILE_IDS];

// Backward compatibility: map "Decorator" terminology to "Ability" (they're the same thing)
export type DecoratorId = AbilityId;
export const DECORATORS: DecoratorId[] = [...ABILITY_IDS];
export const iconForDecorator = iconForAbility;

// Re-export icon functions
export { iconForPiece, iconForTile };
