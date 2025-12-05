// roguelike/encounter/encounter.ts

import { Piece } from "../../catalog/pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { generateValueBasedRoster } from "../util/roster";

/**
 * Generates an enemy roster for an encounter.
 * 
 * @param totalPieceValue - Total value budget for enemy pieces (default: 15)
 * @param totalAbilityValue - Total value budget for enemy abilities (default: 3)
 * @param minimumPawns - Minimum number of pawns (default: 2)
 * @param hasKing - Whether to include a King (bypasses value budget, default: true)
 * @returns Array of enemy pieces
 */
export function generateEnemyRoster(
  totalPieceValue: number = 15,
  totalAbilityValue: number = 3,
  minimumPawns: number = 2,
  hasKing: boolean = true
): Piece[] {
  return generateValueBasedRoster(
    totalPieceValue,
    totalAbilityValue,
    minimumPawns,
    PlayerColor.Black,
    hasKing
  );
}
