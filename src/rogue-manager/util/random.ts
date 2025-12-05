// roguelike/util/random.ts

import { PIECE_IDS, ABILITY_IDS, PieceId, AbilityId } from "../../catalog/registry/Catalog";

// Uniform random
export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomPieceId(): PieceId {
  return randomFrom(PIECE_IDS);
}

export function getRandomAbilityId(): AbilityId {
  return randomFrom(ABILITY_IDS);
}
