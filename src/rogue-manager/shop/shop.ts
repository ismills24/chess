// roguelike/shop/shop.ts

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

export interface ShopOffer {
  piece: Piece;
  cost: number;
}

export function createShopOffer(): ShopOffer {
  const pieceId = getRandomPieceId();

  // Create unpositioned piece for inspection
  let piece = createPiece(pieceId, PlayerColor.White, new Vector2Int(-1, -1));

  // 20% chance to have an ability
  if (Math.random() < ABILITY_CHANCE) {
    const abilityId = getRandomAbilityId();
    piece = applyAbility(abilityId, piece);
  }

  return {
    piece,
    cost: 1,
  };
}

export function canBuyPiece(money: number, currentRoster: Piece[]): boolean {
  return money >= 1 && currentRoster.length < 6;
}

export function buyPiece(
  money: number,
  roster: Piece[],
  offer: ShopOffer
): { money: number; roster: Piece[] } {
  if (!canBuyPiece(money, roster)) {
    return { money, roster }; // or throw error
  }

  return {
    money: money - offer.cost,
    roster: [...roster, offer.piece], // add piece to roster
  };
}
