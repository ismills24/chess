import { RuleSet } from "./RuleSet";
import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { Piece } from "../pieces/Piece";
import { PlayerColor } from "../primitives/PlayerColor";

/**
 * Simple ruleset where the game ends when only one player has pieces remaining.
 * No check/checkmate rules - just survival.
 */
export class LastPieceStandingRuleSet implements RuleSet {
    getLegalMoves(_state: GameState, piece: Piece): Move[] {
        // All pseudo-legal moves are legal in this ruleset
        return piece.getPseudoLegalMoves(_state);
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        const whitePieces = state.board.getAllPieces(PlayerColor.White);
        const blackPieces = state.board.getAllPieces(PlayerColor.Black);

        if (whitePieces.length === 0 && blackPieces.length === 0) {
            return { over: true, winner: null }; // draw
        } else if (whitePieces.length === 0) {
            return { over: true, winner: PlayerColor.Black };
        } else if (blackPieces.length === 0) {
            return { over: true, winner: PlayerColor.White };
        }

        return { over: false, winner: null };
    }
}
