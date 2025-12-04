import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { Piece } from "../pieces/Piece";
import { CheckRules } from "./CheckRules";
import { CheckmateCondition } from "./CheckmateCondition";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";

/**
 * Standard chess ruleset with check/checkmate and king safety.
 */
export class StandardChessRuleSet implements RuleSet {
    private readonly checkmateCondition: CheckmateCondition;

    constructor() {
        this.checkmateCondition = new CheckmateCondition();
    }

    getLegalMoves(state: GameState, piece: Piece): Move[] {
        const legalMoves = piece
            .getCandidateMoves(state)
            .moves.filter(
                (m) => !CheckRules.wouldMovePutKingInCheck(state, m, piece.owner)
            );
        
        // Filter out restricted moves
        const restrictedMoves = state.movementRestrictions || [];
        const filteredMoves = legalMoves.filter(move => {
            return !restrictedMoves.some(restriction =>
                restriction.restrictedSquares.some(sq => sq.equals(move.to))
            );
        });
        
        return filteredMoves;
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        return this.checkmateCondition.isGameOver(state);
    }
}

