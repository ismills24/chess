import { PlayerController } from "./PlayerController";
import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { RuleSet } from "../rules/RuleSet";
import { PlayerColor } from "../primitives/PlayerColor";
import { Simulation } from "../core/Simulation";

/**
 * Greedy AI using negamax with alpha-beta pruning.
 */
export class GreedyAIController implements PlayerController {
    private readonly ruleset: RuleSet;
    private readonly depth: number;

    constructor(ruleset: RuleSet, depth: number = 3) {
        this.ruleset = ruleset;
        this.depth = Math.max(1, depth);
    }

    selectMove(state: GameState): Move | null {
        const start = performance.now();
        const moves = state.getAllLegalMoves(this.ruleset);

        if (moves.length === 0) {
            console.log(`[GreedyAI] No legal moves. Time: ${performance.now() - start}ms`);
            return null;
        }

        let bestScore = Number.NEGATIVE_INFINITY;
        const bestMoves: Move[] = [];

        for (const move of moves) {
            const next = Simulation.simulateTurn(state, move, this.ruleset);
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

    private negamax(node: GameState, depth: number, alpha: number, beta: number): number {
        if (depth === 0 || this.isTerminal(node)) {
            return this.evalFromSideToMove(node);
        }

        const moves = node.getAllLegalMoves(this.ruleset);
        let value = Number.NEGATIVE_INFINITY;

        for (const move of moves) {
            const child = Simulation.simulateTurn(node, move, this.ruleset);
            const score = -this.negamax(child, depth - 1, -beta, -alpha);

            if (score > value) value = score;
            if (value > alpha) alpha = value;
            if (alpha >= beta) break; // alpha-beta cutoff
        }

        return value === Number.NEGATIVE_INFINITY ? this.evalFromSideToMove(node) : value;
    }

    private isTerminal(state: GameState): boolean {
        return this.ruleset.isGameOver(state).over;
    }

    private evalFromSideToMove(state: GameState): number {
        const baseEval = state.evaluate(); // White-positive, Black-negative
        return state.currentPlayer === PlayerColor.White ? baseEval : -baseEval;
    }
}
