import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Move } from "../../chess-engine/primitives/Move";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves } from "../../chess-engine/rules/MovementPatterns";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";

/**
 * Allows the piece to pass through friendly pieces when moving.
 * The piece can jump over friendly pieces but still stops at enemy pieces.
 * This extends candidate moves by continuing sliding movement past friendly blocking pieces.
 */
export class PhantomAbility extends AbilityBase {
    protected readonly abilityValue = 2;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        const originalMoves = this.inner.getCandidateMoves(state);
        
        // Start with all original moves
        const moves: Move[] = [...originalMoves.moves];
        const movesOnFriendlyPieces: Move[] = [...originalMoves.movesOnFriendlyPieces];
        const movesOnEnemyPieces: Move[] = [...originalMoves.movesOnEnemyPieces];

        // For each move that was blocked by a friendly piece, continue sliding past it
        for (const friendlyBlockMove of originalMoves.movesOnFriendlyPieces) {
            const direction = this.calculateDirection(this.inner.position, friendlyBlockMove.to);
            if (!direction) continue;

            // Continue sliding past the friendly piece
            const extendedMoves = this.continueSlidingPastFriendly(
                state,
                friendlyBlockMove.to,
                direction
            );

            // Add extended moves to the appropriate arrays
            for (const move of extendedMoves) {
                moves.push(move);
                if (move.isCapture) {
                    movesOnEnemyPieces.push(move);
                }
            }
        }

        return new CandidateMoves(moves, movesOnFriendlyPieces, movesOnEnemyPieces);
    }

    /**
     * Calculate normalized direction vector from one position to another.
     * Returns a vector with components in {-1, 0, 1}.
     */
    private calculateDirection(from: Vector2Int, to: Vector2Int): Vector2Int | null {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        // Check if positions are aligned (horizontal, vertical, or diagonal)
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Must be aligned in at least one direction
        if (absDx !== 0 && absDy !== 0 && absDx !== absDy) {
            return null; // Not aligned
        }

        const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
        
        return new Vector2Int(stepX, stepY);
    }

    /**
     * Continue sliding in a direction past friendly pieces.
     * Stops at enemy pieces or board boundaries.
     */
    private continueSlidingPastFriendly(
        state: GameState,
        startPos: Vector2Int,
        direction: Vector2Int
    ): Move[] {
        const moves: Move[] = [];
        let pos = startPos.add(direction); // Start one step past the friendly piece

        while (state.board.isInBounds(pos)) {
            const target = state.board.getPieceAt(pos);

            if (!target) {
                // Empty square - valid move
                moves.push(new Move(this.inner.position, pos, this.inner));
            } else if (target.owner !== this.inner.owner) {
                // Enemy piece - capture and stop
                moves.push(new Move(this.inner.position, pos, this.inner, true));
                break;
            } else {
                // Friendly piece - skip over it and continue
                // Don't add a move to this square, just continue sliding
            }

            pos = pos.add(direction);
        }

        return moves;
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new PhantomAbility(inner, this.id);
    }
}

