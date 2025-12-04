import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { Piece } from "../pieces/Piece";
import { CheckRules } from "./CheckRules";
import { CheckmateCondition } from "./CheckmateCondition";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { MovementRestrictions } from "../../chess-engine/rules/MovementPatterns";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";

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
        
        // Filter out restricted moves from pieces and tiles
        const restrictedSquares = new Set<string>();
        
        // Collect restrictions from all pieces
        for (const p of state.board.getAllPieces()) {
            if (p.getRestrictedSquares) {
                const restriction = p.getRestrictedSquares(state);
                if (restriction && restriction.restrictedSquares) {
                    for (const sq of restriction.restrictedSquares) {
                        restrictedSquares.add(`${sq.x},${sq.y}`);
                    }
                }
            }
        }
        
        // Collect restrictions from all tiles
        for (const tile of state.board.getAllTiles()) {
            if (tile.getRestrictedSquares) {
                const restriction = tile.getRestrictedSquares(state);
                if (restriction && restriction.restrictedSquares) {
                    for (const sq of restriction.restrictedSquares) {
                        restrictedSquares.add(`${sq.x},${sq.y}`);
                    }
                }
            }
        }
        
        // Filter out moves to restricted squares
        const filteredMoves = legalMoves.filter((move: Move) => {
            return !restrictedSquares.has(`${move.to.x},${move.to.y}`);
        });
        
        return filteredMoves;
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        return this.checkmateCondition.isGameOver(state);
    }
}

