import { GameState } from "../../chess-engine/state/GameState";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { CheckRules } from "./CheckRules";
import { Piece as CatalogPiece } from "../pieces/Piece";
import { Piece as StatePiece } from "../../chess-engine/state/types";
import { Move } from "../../chess-engine/primitives/Move";

/**
 * Win condition for standard chess: checkmate and stalemate.
 */
export class CheckmateCondition {
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        const currentPlayer = state.currentPlayer;
        const opponent = currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;

        const kingInCheck = CheckRules.isKingInCheck(state, currentPlayer);

        // Does the current player have any legal moves?
        let hasLegalMoves = false;
        for (const piece of state.board.getAllPieces(currentPlayer)) {
            // Piece from board is StatePiece, but we need CatalogPiece for getCandidateMoves
            // Cast is safe because board pieces are always CatalogPiece instances
            if (this.getLegalMovesForPiece(state, piece as unknown as CatalogPiece).length > 0) {
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

    private getLegalMovesForPiece(state: GameState, piece: CatalogPiece): Move[] {
        return piece.getCandidateMoves(state).moves.filter(
            (m) => !CheckRules.wouldMovePutKingInCheck(state, m, piece.owner)
        );
    }
}

