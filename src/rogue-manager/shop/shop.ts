// roguelike/shop/shop.ts

import { Piece } from "../../catalog/pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import {
  createPiece,
  applyAbility,
  type AbilityId,
  type PieceId,
  PIECE_IDS
} from "../../catalog/registry/Catalog";
import { getRandomPieceId, getRandomAbilityId } from "../util/random";
import { AbilityBase } from "../../catalog/abilities/AbilityBase";

/** Chance for a piece to have an ability (1 in 5 = 20%) */


export const MAX_ROSTER_SIZE = 12;

const PROBE_PIECE_ID: PieceId = "Pawn";
const EXCLUDED_PIECE_IDS: ReadonlyArray<PieceId> = ["King"];

export interface ShopPieceOffer {
  id: string;
  piece: Piece;
  cost: number;
}

export interface ShopDecoratorOffer {
  id: string;
  abilityId: AbilityId;
  cost: number;
}

export interface ShopOffer {
  pieces: ShopPieceOffer[];
  decorators: ShopDecoratorOffer[];
}

function computeAbilityCost(abilityId: AbilityId): number {
  // Wrap a probe piece to derive the intrinsic value contribution of the ability.
  const basePiece = createPiece(PROBE_PIECE_ID, PlayerColor.White, new Vector2Int(-1, -1));
  const withAbility = applyAbility(abilityId, basePiece);
  return withAbility.getValue() - basePiece.getValue();
}

function createPieceOffer(): ShopPieceOffer {
  // Ensure we do not offer excluded pieces (e.g., King)
  const candidateIds = PIECE_IDS.filter((id) => !EXCLUDED_PIECE_IDS.includes(id));
  const pieceId = candidateIds[Math.floor(Math.random() * candidateIds.length)] ?? getRandomPieceId();

  // Create unpositioned piece for inspection
  let piece = createPiece(pieceId, PlayerColor.White, new Vector2Int(-1, -1));


  return {
    id: piece.id,
    piece,
    cost: piece.getValue(),
  };
}

function createDecoratorOffer(abilityId: AbilityId, index: number): ShopDecoratorOffer {
  return {
    id: `${abilityId}-${index}`,
    abilityId,
    cost: computeAbilityCost(abilityId),
  };
}

export function createShopOffer(): ShopOffer {
  const pieces: ShopPieceOffer[] = [createPieceOffer(), createPieceOffer()];

  const decorators: ShopDecoratorOffer[] = [];
  for (let i = 0; i < 3; i++) {
    decorators.push(createDecoratorOffer(getRandomAbilityId(), i));
  }

  return { pieces, decorators };
}

function isOfferEmpty(offer: ShopOffer): boolean {
  return offer.pieces.length === 0 && offer.decorators.length === 0;
}

export function canBuyPiece(
  money: number,
  currentRoster: Piece[],
  offer: ShopOffer,
  pieceIndex: number
): boolean {
  const pieceOffer = offer.pieces[pieceIndex];
  if (!pieceOffer) return false;
  if (pieceOffer.piece.name === "King") return false;
  return money >= pieceOffer.cost && currentRoster.length < MAX_ROSTER_SIZE;
}

export function buyPiece(
  money: number,
  roster: Piece[],
  offer: ShopOffer,
  pieceIndex: number
): { money: number; roster: Piece[]; offer: ShopOffer | null } {
  if (!canBuyPiece(money, roster, offer, pieceIndex)) {
    return { money, roster, offer }; // or throw error
  }

  const pieceOffer = offer.pieces[pieceIndex];
  const remainingPieces = offer.pieces.filter((_, i) => i !== pieceIndex);
  const nextOffer: ShopOffer = {
    pieces: remainingPieces,
    decorators: offer.decorators,
  };

  const updatedOffer = isOfferEmpty(nextOffer) ? null : nextOffer;
  return {
    money: money - pieceOffer.cost,
    roster: [...roster, pieceOffer.piece], // add piece to roster
    offer: updatedOffer,
  };
}

export function canBuyDecorator(
  money: number,
  roster: Piece[],
  offer: ShopOffer,
  decoratorIndex: number,
  targetPieceId: string | null
): boolean {
  if (!targetPieceId) return false;
  const decoratorOffer = offer.decorators[decoratorIndex];
  if (!decoratorOffer) return false;
  const target = roster.find((p) => p.id === targetPieceId);
  if (!target) return false;
  return money >= decoratorOffer.cost;
}

export function buyDecorator(
  money: number,
  roster: Piece[],
  offer: ShopOffer,
  decoratorIndex: number,
  targetPieceId: string
): { money: number; roster: Piece[]; offer: ShopOffer | null } {
  if (!canBuyDecorator(money, roster, offer, decoratorIndex, targetPieceId)) {
    return { money, roster, offer };
  }

  const decoratorOffer = offer.decorators[decoratorIndex];
  const targetIndex = roster.findIndex((p) => p.id === targetPieceId);
  if (targetIndex === -1) {
    return { money, roster, offer };
  }

  const upgradedPiece = applyAbility(decoratorOffer.abilityId, roster[targetIndex]);
  const newRoster = [...roster];
  newRoster[targetIndex] = upgradedPiece;

  const remainingDecorators = offer.decorators.filter((_, i) => i !== decoratorIndex);
  const nextOffer: ShopOffer = {
    pieces: offer.pieces,
    decorators: remainingDecorators,
  };

  const updatedOffer = isOfferEmpty(nextOffer) ? null : nextOffer;

  return {
    money: money - decoratorOffer.cost,
    roster: newRoster,
    offer: updatedOffer,
  };
}

export function getPieceSellValue(piece: Piece): number {
  // getValue already includes decorator contributions; selling returns half the total value (floored)
  return Math.floor(piece.getValue() / 2);
}

export function canSellPiece(roster: Piece[], pieceId: string): boolean {
  const target = roster.find((p) => p.id === pieceId);
  if (!target) return false;
  if (target.name === "King") return false;
  return true;
}

export function sellPiece(
  money: number,
  roster: Piece[],
  pieceId: string
): { money: number; roster: Piece[] } {
  if (!canSellPiece(roster, pieceId)) {
    return { money, roster };
  }

  const targetIndex = roster.findIndex((p) => p.id === pieceId);
  const target = roster[targetIndex];
  const sellValue = getPieceSellValue(target);

  const newRoster = [...roster];
  newRoster.splice(targetIndex, 1);

  return {
    money: money + sellValue,
    roster: newRoster,
  };
}
