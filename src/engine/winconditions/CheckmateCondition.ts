import { WinCondition } from "./WinCondition";
import { GameState } from "../state/GameState";
import { PlayerColor } from "../primitives/PlayerColor";
import { Piece } from "../pieces/Piece";
import { Move } from "../primitives/Move";
import { CheckRules } from "../rules/CheckRules";

/**
 * Win condition for standard chess checkmate and stalemate.
 */
export class CheckmateCondition implements WinCondition {
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        const currentPlayer = state.currentPlayer;
        const opponent = currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;

        const kingInCheck = CheckRules.isKingInCheck(state, currentPlayer);

        // Does the current player have any legal moves?
        let hasLegalMoves = false;
        for (const piece of state.board.getAllPieces(currentPlayer)) {
            if (this.getLegalMovesForPiece(state, piece).length > 0) {
                hasLegalMoves = true;
                break;
            }
        }

        if (kingInCheck && !hasLegalMoves) {
            return { over: true, winner: opponent }; // Checkmate
        } else if (!kingInCheck && !hasLegalMoves) {
            return { over: true, winner: null }; // Stalemate
        }

        return { over: false, winner: null };
    }

    private getLegalMovesForPiece(state: GameState, piece: Piece): Move[] {
        return piece.getCandidateMoves(state).moves.filter(
            (m) => !CheckRules.wouldMovePutKingInCheck(state, m, piece.owner)
        );
    }
}
