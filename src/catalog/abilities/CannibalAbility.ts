import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Move } from "../../chess-engine/primitives/Move";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves } from "../../chess-engine/rules/MovementPatterns";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";

/**
 * A cannibalistic piece can only capture friendly pieces.
 * This is handled via getCandidateMoves filtering, not via listeners.
 */
export class CannibalAbility extends AbilityBase {
    protected readonly abilityValue = 1;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        const movesOnFriendlyPieces: Move[] = [];
        const originalMoves = this.inner.getCandidateMoves(state);
        
        // Keep all empty square moves (non-capture moves to empty squares)
        for (const move of originalMoves.moves) {
            const isEnemyCapture = originalMoves.movesOnEnemyPieces.some(m => m.to.equals(move.to));
            const isFriendlyBlock = originalMoves.movesOnFriendlyPieces.some(m => m.to.equals(move.to));
            
            // Keep moves to empty squares (not enemy captures, not friendly blocks)
            if (!isEnemyCapture && !isFriendlyBlock) {
                moves.push(move);
            }
        }
        
        // Convert friendly piece blocks to capture moves
        // These are positions where the piece would normally be blocked by a friendly piece
        // For cannibals, these become valid capture targets
        for (const friendlyBlockMove of originalMoves.movesOnFriendlyPieces) {
            const target = state.board.getPieceAt(friendlyBlockMove.to);
            if (target && target.owner === this.inner.owner) {
                // Convert to capture move
                const captureMove = new Move(
                    friendlyBlockMove.from,
                    friendlyBlockMove.to,
                    this.inner,
                    true // isCapture = true
                );
                moves.push(captureMove);
                movesOnFriendlyPieces.push(captureMove);
            }
        }
        
        // Remove all enemy captures (cannibals cannot capture enemies)
        // movesOnEnemyPieces are already excluded from the moves array above
        
        return new CandidateMoves(moves, movesOnFriendlyPieces, []);
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new CannibalAbility(inner, this.id);
    }
}

