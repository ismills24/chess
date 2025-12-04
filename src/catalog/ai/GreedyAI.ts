import { AI } from "./AI";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { ChessEngine } from "../../chess-engine/core/ChessEngine";
import { RuleSet } from "../../chess-engine/rules/RuleSet";

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

    getMove(state: GameState, legalMoves: Move[]): Move | null {
        if (legalMoves.length === 0) {
            return null;
        }

        const start = performance.now();
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

        const end = performance.now();
        const choice = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        console.log(
            `[GreedyAI] Selected move among ${bestMoves.length} options (score=${bestScore}). Time=${end - start}ms`
        );
        return choice;
    }

    /**
     * Simulate a move by resolving it through ChessEngine.
     * Note: AI simulation doesn't need turn events, just the move resolution.
     */
    private simulateTurn(state: GameState, move: Move): GameState {
        const result = ChessEngine.resolveMove(state, move);
        // Update state to reflect the move (but don't advance turn - that's for actual gameplay)
        return result.finalState;
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
     * This is a simple implementation - can be enhanced later.
     */
    private getPieceValue(piece: any): number {
        // Try to call getValue() if it exists (from catalog pieces)
        if (typeof piece.getValue === "function") {
            return piece.getValue();
        }
        
        // Fallback: simple piece type values
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

