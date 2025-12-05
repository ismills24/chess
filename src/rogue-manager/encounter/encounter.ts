// roguelike/encounter/encounter.ts

import { Piece } from "../../catalog/pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import {
  createPiece,
  applyAbility
} from "../../catalog/registry/Catalog";
import { getRandomPieceId, getRandomAbilityId } from "../util/random";

/** Chance for a piece to have an ability (1 in 5 = 20%) */
const ABILITY_CHANCE = 0.2;

export function generateEnemyRoster(): Piece[] {
  const pieces: Piece[] = [];

  for (let i = 0; i < 6; i++) {
    const pieceId = getRandomPieceId();

    let piece = createPiece(pieceId, PlayerColor.Black, new Vector2Int(-1, -1));
    
    // 20% chance to have an ability
    if (Math.random() < ABILITY_CHANCE) {
      const abilityId = getRandomAbilityId();
      piece = applyAbility(abilityId, piece);
    }

    pieces.push(piece);
  }

  return pieces;
}