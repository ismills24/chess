import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves } from "../../chess-engine/rules/MovementPatterns";
import { Move, MoveType } from "../../chess-engine/primitives/Move";

/**
 * Allows the piece to place WallTiles on empty squares within range 2.
 * Movement takes priority - tiles cannot be placed where the piece can move.
 */
export class WallPlacementAbility extends AbilityBase {
    protected readonly abilityValue = 2;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        // STEP 1: Get regular moves from inner piece
        const innerMoves = this.inner.getCandidateMoves(state);

        // STEP 2: Calculate candidate tile placement positions (within range 2)
        const candidatePlacements: Vector2Int[] = [];
        const range = 2;
        const piecePos = this.position;

        // Generate all positions within range 2 (including diagonals)
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                // Skip the piece's current position
                if (dx === 0 && dy === 0) continue;

                const pos = piecePos.add(new Vector2Int(dx, dy));
                if (state.board.isInBounds(pos)) {
                    candidatePlacements.push(pos);
                }
            }
        }

        // STEP 3: Filter out positions where piece can move (movement takes priority)
        const movePositions = new Set(innerMoves.moves.map(m => `${m.to.x},${m.to.y}`));

        // STEP 4: Filter valid tile placements
        const validPlacements = candidatePlacements.filter(pos => {
            const key = `${pos.x},${pos.y}`;
            
            // PRIORITY CHECK: If piece can move here, cannot place tile here
            if (movePositions.has(key)) return false;
            
            // Filter out occupied squares
            const pieceAtPos = state.board.getPieceAt(pos);
            if (pieceAtPos) return false; // Only empty squares
            
            return true;
        });

        // STEP 5: Create Move objects for valid tile placements with isCastMove: true
        const tilePlacementMoves = validPlacements.map(pos =>
            new Move(
                this.position,  // from = piece position (piece stays here)
                pos,            // to = tile placement position
                this.inner,     // piece reference
                false,          // isCapture = false
                MoveType.SLIDE, // type doesn't matter for tile placements
                true            // isCastMove = true (flags this as a cast/tile placement move)
            )
        );

        // STEP 6: Return CandidateMoves with both regular moves and tile placement moves
        const allMoves = [...innerMoves.moves, ...tilePlacementMoves];
        return new CandidateMoves(allMoves, innerMoves.movesOnFriendlyPieces,
            innerMoves.movesOnEnemyPieces, innerMoves.movesOnIllegalTiles);
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new WallPlacementAbility(inner, this.id);
    }
}
