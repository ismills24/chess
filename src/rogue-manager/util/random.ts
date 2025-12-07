// roguelike/util/random.ts

import { PIECE_IDS, ABILITY_IDS, PieceId, AbilityId } from "../../catalog/registry/Catalog";

const BLACKLISTED_ABILITIES: ReadonlySet<AbilityId> = new Set([
  "Cannibal",
  "Piercing",
  "Bouncer",
]);

// Uniform random
export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomPieceId(): PieceId {
  return randomFrom(PIECE_IDS);
}

export function getRandomAbilityId(): AbilityId {
  const allowed = ABILITY_IDS.filter((id) => !BLACKLISTED_ABILITIES.has(id));
  return randomFrom(allowed.length > 0 ? allowed : ABILITY_IDS);
}
