import { Vector2Int } from "../primitives/Vector2Int";
import { Move, MoveType } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { Piece } from "../state/types";

/**
 * Provides helper methods for common chess movement patterns (sliding, jumping).
 * These are primitive movement utilities used by piece implementations.
 */
export class MovementPatterns {
    /**
     * Generate sliding moves in given directions until blocked.
     */
    static getSlidingMoves(
        piece: Piece,
        state: GameState,
        ...directions: Vector2Int[]
    ): CandidateMoves {
        const moves: Move[] = [];
        const movesOnEnemyPieces: Move[] = [];
        const movesOnFriendlyPieces: Move[] = [];
        for (const dir of directions) {
            let pos = piece.position.add(dir);

            while (state.board.isInBounds(pos)) {
                const target = state.board.getPieceAt(pos);

                if (!target) {
                    moves.push(new Move(piece.position, pos, piece));
                } else {
                    if (target.owner !== piece.owner) {
                        moves.push(new Move(piece.position, pos, piece, true));
                        movesOnEnemyPieces.push(new Move(piece.position, pos, piece, true));
                    } else {
                        movesOnFriendlyPieces.push(new Move(piece.position, pos, piece));
                    }
                    break; // stop at first piece
                }

                pos = pos.add(dir);
            }
        }
        return new CandidateMoves(moves, movesOnFriendlyPieces, movesOnEnemyPieces);
    }

    /**
     * Generate single-step jump moves in given offsets.
     */
    static getJumpMoves(
        piece: Piece,
        state: GameState,
        ...offsets: Vector2Int[]
    ): CandidateMoves {
        const moves: Move[] = [];
        const movesOnEnemyPieces: Move[] = [];
        const movesOnFriendlyPieces: Move[] = [];
        for (const offset of offsets) {
            const pos = piece.position.add(offset);
            if (!state.board.isInBounds(pos)) continue;

            const target = state.board.getPieceAt(pos);
            if (!target) {
                moves.push(new Move(piece.position, pos, piece, false, MoveType.JUMP));
            } else if (target.owner !== piece.owner) {
                moves.push(new Move(piece.position, pos, piece, true, MoveType.JUMP));
                movesOnEnemyPieces.push(new Move(piece.position, pos, piece, true, MoveType.JUMP));
            } else {
                movesOnFriendlyPieces.push(new Move(piece.position, pos, piece, true, MoveType.JUMP));
            }
        }
        return new CandidateMoves(moves, movesOnFriendlyPieces, movesOnEnemyPieces);
    }

    /**
     * Get all squares along a linear path from start to end (excluding start, including end).
     * 
     * @param from - Starting position
     * @param to - Ending position
     * @returns Array of positions along the path
     */
    static getLinearPath(from: Vector2Int, to: Vector2Int): Vector2Int[] {
        const path: Vector2Int[] = [];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        // Calculate direction (normalized to -1, 0, or 1)
        const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
        
        // Calculate distance
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        
        // Generate path (excluding start, including end)
        for (let i = 1; i <= distance; i++) {
            path.push(new Vector2Int(from.x + stepX * i, from.y + stepY * i));
        }
        
        return path;
    }

    /**
     * Collect tile-based movement restrictions from the board.
     * 
     * @param state - Current game state
     * @returns Object containing sets of all restricted squares and obstacle squares
     */
    static collectTileRestrictions(state: GameState): {
        allRestrictedSquares: Set<string>;
        obstacleSquares: Set<string>;
    } {
        const tileRestrictions = state.board.getAllTiles()
            .map((tile) => tile.getRestrictedSquares?.(state))
            .filter((restriction): restriction is NonNullable<typeof restriction> => restriction !== null && restriction !== undefined);
        
        // Collect all restricted squares (both obstacle and target types)
        const allRestrictedSquares = new Set<string>();
        const obstacleSquares = new Set<string>();
        for (const restriction of tileRestrictions) {
            for (const restrictedSquare of restriction.restrictedSquares) {
                const squareKey = `${restrictedSquare.square.x},${restrictedSquare.square.y}`;
                allRestrictedSquares.add(squareKey);
                if (restrictedSquare.type === "obstacle") {
                    obstacleSquares.add(squareKey);
                }
            }
        }
        
        return { allRestrictedSquares, obstacleSquares };
    }
}

export class CandidateMoves {
    moves: Move[];
    movesOnFriendlyPieces: Move[];
    movesOnEnemyPieces: Move[];
    movesOnIllegalTiles: Move[];

    constructor(
        moves: Move[],
        movesOnFriendlyPieces: Move[] = [],
        movesOnEnemyPieces: Move[] = [],
        movesOnIllegalTiles: Move[] = []
    ) {
        this.moves = moves;
        this.movesOnFriendlyPieces = movesOnFriendlyPieces;
        this.movesOnEnemyPieces = movesOnEnemyPieces;
        this.movesOnIllegalTiles = movesOnIllegalTiles;
    }
}

export interface RestrictedMove {
    move: Move;
    sourceId: string;
}



