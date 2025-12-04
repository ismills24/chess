import { GameState } from "../../chess-engine/state/GameState";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Move } from "../../chess-engine/primitives/Move";
import { King } from "../pieces/standard/King";
import { Pawn } from "../pieces/standard/Pawn";
import { Piece } from "../pieces/Piece";

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

        cloned.board.removePiece(move.from);
        const target = cloned.board.getPieceAt(move.to);
        if (target) cloned.board.removePiece(move.to);

        cloned.board.placePiece(piece, move.to);

        return this.isKingInCheck(cloned, movingPlayer);
    }
}

