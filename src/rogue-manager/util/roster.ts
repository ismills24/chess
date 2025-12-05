// rogue-manager/util/roster.ts

import { Piece } from "../../catalog/pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { createPiece, applyAbility, PieceId, AbilityId, PIECE_IDS, ABILITY_IDS } from "../../catalog/registry/Catalog";

/**
 * Lazy-computed cache for piece values
 */
let _pieceValuesCache: Record<PieceId, number> | null = null;

function getPieceValues(): Record<PieceId, number> {
    if (!_pieceValuesCache) {
        _pieceValuesCache = {} as Record<PieceId, number>;
        for (const pieceId of PIECE_IDS) {
            // Create a temporary piece to get its value
            const tempPiece = createPiece(pieceId, PlayerColor.White, new Vector2Int(0, 0));
            _pieceValuesCache[pieceId] = tempPiece.getValue();
        }
    }
    return _pieceValuesCache;
}

/**
 * Lazy-computed cache for ability values
 */
let _abilityValuesCache: Record<AbilityId, number> | null = null;

function getAbilityValues(): Record<AbilityId, number> {
    if (!_abilityValuesCache) {
        _abilityValuesCache = {} as Record<AbilityId, number>;
        // Create a base pawn to apply abilities to
        const basePiece = createPiece("Pawn", PlayerColor.White, new Vector2Int(0, 0));
        const baseValue = basePiece.getValue();
        
        for (const abilityId of ABILITY_IDS) {
            // Apply ability and get the difference
            const pieceWithAbility = applyAbility(abilityId, basePiece);
            _abilityValuesCache[abilityId] = pieceWithAbility.getValue() - baseValue;
        }
    }
    return _abilityValuesCache;
}

/**
 * Gets all piece IDs excluding King (sorted by value for better distribution)
 */
function getSelectablePieceIds(): PieceId[] {
    return PIECE_IDS.filter(id => id !== "King");
}

function selectRandomPieceWithinBudget(maxValue: number): PieceId | null {
    const pieceValues = getPieceValues();
    const affordablePieces = getSelectablePieceIds().filter(id => pieceValues[id] <= maxValue);
    if (affordablePieces.length === 0) return null;
    return affordablePieces[Math.floor(Math.random() * affordablePieces.length)];
}

function selectRandomAbilityWithinBudget(maxValue: number): AbilityId | null {
    const abilityValues = getAbilityValues();
    const affordableAbilities = ABILITY_IDS.filter(id => abilityValues[id] <= maxValue);
    if (affordableAbilities.length === 0) return null;
    return affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
}

export function generateValueBasedRoster(
    totalPieceValue: number,
    totalAbilityValue: number,
    minimumPawns: number,
    owner: PlayerColor,
    hasKing: boolean = true
): Piece[] {
    const pieces: Piece[] = [];
    const pieceValues = getPieceValues();
    const abilityValues = getAbilityValues();
    let remainingPieceValue = totalPieceValue;
    let remainingAbilityValue = totalAbilityValue;

    // Validate and cap minimumPawns to what's affordable
    const pawnValue = pieceValues["Pawn"];
    const maxAffordablePawns = Math.floor(totalPieceValue / pawnValue);
    const actualMinimumPawns = Math.min(minimumPawns, maxAffordablePawns);

    // Step 0: Add King if requested (bypasses value budget)
    if (hasKing) {
        const king = createPiece("King", owner, new Vector2Int(-1, -1));
        pieces.push(king);
    }

    // Step 1: Add minimum pawns
    for (let i = 0; i < actualMinimumPawns; i++) {
        const piece = createPiece("Pawn", owner, new Vector2Int(-1, -1));
        pieces.push(piece);
        remainingPieceValue -= pawnValue;
    }

    // Step 2: Fill remaining piece value budget
    while (remainingPieceValue > 0) {
        const pieceId = selectRandomPieceWithinBudget(remainingPieceValue);
        if (!pieceId) break; // No affordable pieces left
        
        const piece = createPiece(pieceId, owner, new Vector2Int(-1, -1));
        pieces.push(piece);
        remainingPieceValue -= pieceValues[pieceId];
    }

    // Step 3: Randomly apply abilities to pieces within ability budget
    while (remainingAbilityValue > 0 && pieces.length > 0) {
        const abilityId = selectRandomAbilityWithinBudget(remainingAbilityValue);
        if (!abilityId) break; // No affordable abilities left
        
        // Select a random piece to apply the ability to
        const pieceIndex = Math.floor(Math.random() * pieces.length);
        pieces[pieceIndex] = applyAbility(abilityId, pieces[pieceIndex]);
        remainingAbilityValue -= abilityValues[abilityId];
    }

    return pieces;
}

/**
 * Gets the value of a specific piece type from the catalog
 */
export function getPieceValue(pieceId: PieceId): number {
    return getPieceValues()[pieceId];
}

/**
 * Gets the value of a specific ability from the catalog
 */
export function getAbilityValue(abilityId: AbilityId): number {
    return getAbilityValues()[abilityId];
}

/**
 * Gets all piece values as a read-only record
 */
export function getAllPieceValues(): Readonly<Record<PieceId, number>> {
    return getPieceValues();
}

/**
 * Gets all ability values as a read-only record
 */
export function getAllAbilityValues(): Readonly<Record<AbilityId, number>> {
    return getAbilityValues();
}

/**
 * Creates a random piece for the player's roster (legacy function).
 * @deprecated Use generateValueBasedRoster instead
 */
export function createRandomRosterPiece(): Piece {
    const pieceId = selectRandomPieceWithinBudget(100) ?? "Pawn";
    let piece = createPiece(pieceId, PlayerColor.White, new Vector2Int(-1, -1));
    
    if (Math.random() < 0.2) {
        const abilityId = selectRandomAbilityWithinBudget(100);
        if (abilityId) {
            piece = applyAbility(abilityId, piece);
        }
    }

    return piece;
}

