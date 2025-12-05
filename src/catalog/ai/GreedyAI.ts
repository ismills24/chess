import { AI } from "./AI";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { ChessEngine } from "../../chess-engine/core/ChessEngine";
import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { TurnAdvancedEvent } from "../../chess-engine/events/EventRegistry";

/**
 * Greedy AI using negamax with alpha-beta pruning.
 * Ported from old GreedyAIController.
 */
export class GreedyAI implements AI {
    private readonly ruleset: RuleSet;
    private readonly depth: number;

    constructor(ruleset: RuleSet, depth: number = 3) {
        this.ruleset = ruleset;
        this.depth = Math.max(1, depth);
    }

    getMove(state: GameState, legalMoves: Move[]): Move | null | Promise<Move | null> {
        if (legalMoves.length === 0) {
            return null;
        }

        let bestScore = Number.NEGATIVE_INFINITY;
        const bestMoves: Move[] = [];

        for (const move of legalMoves) {
            const next = this.simulateTurn(state, move);
            const score = -this.negamax(next, this.depth - 1, Number.NEGATIVE_INFINITY / 2, Number.POSITIVE_INFINITY / 2);

            if (score > bestScore) {
                bestScore = score;
                bestMoves.length = 0;
                bestMoves.push(move);
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        const choice = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        return choice;
    }

    private simulateTurn(state: GameState, move: Move): GameState {
        // Resolve the move
        const moveResult = ChessEngine.resolveMove(state, move);
        let newState = moveResult.finalState;
        
        const nextPlayer = state.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const turnAdvancedEvent = new TurnAdvancedEvent(nextPlayer, state.turnNumber + 1);
        const turnResult = ChessEngine.resolveEvent(newState, turnAdvancedEvent);
        
        return turnResult.finalState;
    }

    private negamax(node: GameState, depth: number, alpha: number, beta: number): number {
        if (depth === 0 || this.isTerminal(node)) {
            return this.evalFromSideToMove(node);
        }

        // Get all legal moves for current player
        const allMoves: Move[] = [];
        for (const piece of node.board.getAllPieces(node.currentPlayer)) {
            const moves = ChessEngine.getLegalMoves(node, piece, this.ruleset);
            allMoves.push(...moves);
        }

        if (allMoves.length === 0) {
            return this.evalFromSideToMove(node);
        }

        let value = Number.NEGATIVE_INFINITY;

        for (const move of allMoves) {
            const child = this.simulateTurn(node, move);
            const score = -this.negamax(child, depth - 1, -beta, -alpha);

            if (score > value) value = score;
            if (value > alpha) alpha = value;
            if (alpha >= beta) break; // alpha-beta cutoff
        }

        return value === Number.NEGATIVE_INFINITY ? this.evalFromSideToMove(node) : value;
    }

    private isTerminal(state: GameState): boolean {
        return ChessEngine.isGameOver(state, this.ruleset).over;
    }

    private evalFromSideToMove(state: GameState): number {
        // Simple evaluation: sum of piece values
        // White pieces positive, Black pieces negative
        let score = 0;
        for (const piece of state.board.getAllPieces()) {
            const value = this.getPieceValue(piece);
            if (piece.owner === PlayerColor.White) {
                score += value;
            } else {
                score -= value;
            }
        }
        
        // Return score from perspective of current player
        return state.currentPlayer === PlayerColor.White ? score : -score;
    }

    /**
     * Get the value of a piece for evaluation.
     * Uses the piece's getValue() method which properly handles ability chains.
     */
    private getPieceValue(piece: any): number {
        // All catalog pieces implement getValue() which handles ability wrapping
        if (typeof piece.getValue === "function") {
            return piece.getValue();
        }
        
        // Fallback: simple piece type values (shouldn't happen with catalog pieces)
        const name = piece.name?.toLowerCase() || "";
        if (name.includes("king")) return 1000;
        if (name.includes("queen")) return 9;
        if (name.includes("rook")) return 5;
        if (name.includes("bishop")) return 3;
        if (name.includes("knight")) return 3;
        if (name.includes("pawn")) return 1;
        return 1; // default
    }
}

