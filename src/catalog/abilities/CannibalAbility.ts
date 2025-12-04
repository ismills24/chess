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
        
        // Keep all non-enemy moves (empty squares)
        for (const move of originalMoves.moves) {
            const isEnemy = originalMoves.movesOnEnemyPieces.some(m => m.to.equals(move.to));
            if (!isEnemy) {
                moves.push(move);
            }
        }
        
        // Add capture moves for friendly pieces that are in capture positions
        // For pieces like pawns, we need to check diagonal positions for friendly pieces
        const piecePos = this.inner.position;
        const owner = this.inner.owner;
        
        // Check all adjacent squares for friendly pieces (cannibals can capture friendly in any direction)
        const directions = [
            new Vector2Int(-1, -1), new Vector2Int(0, -1), new Vector2Int(1, -1),
            new Vector2Int(-1, 0), new Vector2Int(1, 0),
            new Vector2Int(-1, 1), new Vector2Int(0, 1), new Vector2Int(1, 1),
        ];
        
        for (const dir of directions) {
            const pos = piecePos.add(dir);
            if (!state.board.isInBounds(pos)) continue;
            
            const target = state.board.getPieceAt(pos);
            if (target && target.owner === owner) {
                // Create capture move for friendly piece
                const captureMove = new Move(piecePos, pos, this.inner, true);
                moves.push(captureMove);
                movesOnFriendlyPieces.push(captureMove);
            }
        }
        
        return new CandidateMoves(moves, movesOnFriendlyPieces, []);
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new CannibalAbility(inner, this.id);
    }
}

