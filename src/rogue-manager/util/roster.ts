// rogue-manager/util/roster.ts

import { Piece } from "../../catalog/pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { createPiece, applyAbility } from "../../catalog/registry/Catalog";
import { getRandomPieceId, getRandomAbilityId } from "./random";

/** Chance for a piece to have an ability (1 in 5 = 20%) */
const ABILITY_CHANCE = 0.2;

/**
 * Creates a random piece for the player's roster.
 * Has a 20% chance to have a random ability.
 * Pieces are created unpositioned (position will be set when placed on board).
 */
export function createRandomRosterPiece(): Piece {
    const pieceId = getRandomPieceId();

    // Create unpositioned piece (will be positioned when placed on board)
    let piece = createPiece(pieceId, PlayerColor.White, new Vector2Int(-1, -1));
    
    // 20% chance to have an ability
    if (Math.random() < ABILITY_CHANCE) {
        const abilityId = getRandomAbilityId();
        piece = applyAbility(abilityId, piece);
    }

    return piece;
}

