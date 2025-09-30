import { RuleSet } from "./RuleSet";
import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { Piece } from "../pieces/Piece";
import { CheckRules } from "./CheckRules";
import { CheckmateCondition } from "../winconditions/CheckmateCondition";
import { PlayerColor } from "../primitives/PlayerColor";
import { GetRestrictedMoves } from "../pieces/MovementHelper";

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
    const restrictions = state.getAllMovementRestrictions();
    const restrictedMoves = GetRestrictedMoves(legalMoves, restrictions);
    console.log('restrictedMoves', restrictedMoves);
    return legalMoves;
  }

  isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
    return this.checkmateCondition.isGameOver(state);
  }
}
