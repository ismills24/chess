import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { Piece } from "../pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { King } from "../pieces/standard/King";
import { AbilityBase } from "../abilities/AbilityBase";

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
        const hasKing = (pieces: readonly any[]) =>
            pieces.some((p) => {
                let current: any = p;
                while (current instanceof AbilityBase) {
                    current = current.innerPiece;
                }
                return current instanceof King;
            });

        const whiteKingAlive = hasKing(state.board.getAllPieces(PlayerColor.White));
        const blackKingAlive = hasKing(state.board.getAllPieces(PlayerColor.Black));

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



