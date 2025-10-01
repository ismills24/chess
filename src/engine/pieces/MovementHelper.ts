import { Vector2Int } from "../primitives/Vector2Int";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { Piece } from "./Piece";

/**
 * Provides helper methods for common chess movement patterns (sliding, jumping).
 */
export class MovementHelper {
  /**
   * Generate sliding moves in given directions until blocked.
   */
  static getSlidingMoves(
    piece: Piece,
    state: GameState,
    ...directions: Vector2Int[]
  ): CandidateMoves {
    const moves: Move[] = [];
    for (const dir of directions) {
      let pos = piece.position.add(dir);

      while (state.board.isInBounds(pos)) {
        const target = state.board.getPieceAt(pos);

        if (!target) {
          moves.push(new Move(piece.position, pos, piece));
        } else {
          if (target.owner !== piece.owner) {
            moves.push(new Move(piece.position, pos, piece, true));
          }
          break; // stop at first piece
        }

        pos = pos.add(dir);
      }
    }
    return new CandidateMoves(moves);
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
    for (const offset of offsets) {
      const pos = piece.position.add(offset);
      if (!state.board.isInBounds(pos)) continue;

      const target = state.board.getPieceAt(pos);
      if (!target) {
        moves.push(new Move(piece.position, pos, piece));
      } else if (target.owner !== piece.owner) {
        moves.push(new Move(piece.position, pos, piece, true));
      }
    }
    return new CandidateMoves(moves);
  }
}

export class CandidateMoves {
  moves: Move[];
  movesOnFriendlyPieces: Move[];
  movesOnIllegalTiles: Move[];

  constructor(
    moves: Move[],
    movesOnFriendlyPieces: Move[] = [],
    movesOnIllegalTiles: Move[] = []
  ) {
    this.moves = moves;
    this.movesOnFriendlyPieces = movesOnFriendlyPieces;
    this.movesOnIllegalTiles = movesOnIllegalTiles;
  }
}

export interface MovementRestrictions {
  restrictedSquares: Vector2Int[];
  sourceId: string;
}

export interface RestrictedMove {
  move: Move;
  sourceId: string;
}