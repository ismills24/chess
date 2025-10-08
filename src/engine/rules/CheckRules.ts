import { GameState } from "../state/GameState";
import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Move } from "../primitives/Move";
import { King } from "../pieces/standard/King";
import { Pawn } from "../pieces/standard/Pawn";

/**
 * Helper class for checking chess rules like check and checkmate.
 */
export class CheckRules {
    static isKingInCheck(state: GameState, kingColor: PlayerColor): boolean {
        const king = state.board.getAllPieces(kingColor).find((p) => p instanceof King);
        if (!king) return true; // No king = checkmate

        const opponent = kingColor === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const opponentPieces = state.board.getAllPieces(opponent);

        for (const piece of opponentPieces) {
            if (piece instanceof Pawn) {
                const direction = piece.owner === PlayerColor.White ? 1 : -1;
                const attacks = [
                    new Vector2Int(piece.position.x - 1, piece.position.y + direction),
                    new Vector2Int(piece.position.x + 1, piece.position.y + direction),
                ];
                if (attacks.some((a) => a.equals(king.position))) {
                    return true;
                }
            } else {
                if (piece.getCandidateMoves(state).moves.some((m) => m.to.equals(king.position))) {
                    return true;
                }
            }
        }
        return false;
    }

    static wouldMovePutKingInCheck(
        state: GameState,
        move: Move,
        movingPlayer: PlayerColor
    ): boolean {
        const cloned = state.clone();
        const piece = cloned.board.getPieceAt(move.from);
        if (!piece) return true;

        const target = cloned.board.getPieceAt(move.to);
        
        // If target is a friendly piece, this is a swap (e.g., SwapperDecorator)
        // Simulate a swap instead of a capture
        if (target && target.owner === movingPlayer) {
            // Swap by removing both and placing in opposite positions
            cloned.board.removePiece(move.from);
            cloned.board.removePiece(move.to);
            cloned.board.placePiece(piece, move.to);
            cloned.board.placePiece(target, move.from);
        } else {
            // Normal move or capture
            cloned.board.removePiece(move.from);
            if (target) cloned.board.removePiece(move.to);
            cloned.board.placePiece(piece, move.to);
        }

        return this.isKingInCheck(cloned, movingPlayer);
    }
}
