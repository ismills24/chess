import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { Piece } from "../pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { King } from "../pieces/standard/King";

/**
 * Simple ruleset where the game ends when a king is captured.
 * No check/checkmate rules - just king survival.
 */
export class LastPieceStandingRuleSet implements RuleSet {
    getLegalMoves(_state: GameState, piece: Piece): Move[] {
        // All pseudo-legal moves are legal in this ruleset
        return piece.getCandidateMoves(_state).moves;
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        const whiteKingAlive = state.board
            .getAllPieces(PlayerColor.White)
            .some((p) => p instanceof King);
        const blackKingAlive = state.board
            .getAllPieces(PlayerColor.Black)
            .some((p) => p instanceof King);

        if (!whiteKingAlive && !blackKingAlive) {
            return { over: true, winner: null }; // both kings gone -> draw
        } else if (!whiteKingAlive) {
            return { over: true, winner: PlayerColor.Black };
        } else if (!blackKingAlive) {
            return { over: true, winner: PlayerColor.White };
        }

        return { over: false, winner: null };
    }
}



