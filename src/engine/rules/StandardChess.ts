import { RuleSet } from "./RuleSet";
import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { Piece } from "../pieces/Piece";
import { CheckRules } from "./CheckRules";
import { CheckmateCondition } from "../winconditions/CheckmateCondition";
import { PlayerColor } from "../primitives/PlayerColor";

/**
 * Standard chess ruleset with check/checkmate and king safety.
 */
export class StandardChessRuleSet implements RuleSet {
    private readonly checkmateCondition: CheckmateCondition;

    constructor() {
        this.checkmateCondition = new CheckmateCondition();
    }

    getLegalMoves(state: GameState, piece: Piece): Move[] {
        return piece.getPseudoLegalMoves(state).filter(
            (m) => !CheckRules.wouldMovePutKingInCheck(state, m, piece.owner)
        );
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        return this.checkmateCondition.isGameOver(state);
    }
}
