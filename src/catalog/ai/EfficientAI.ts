import { AI } from "./AI";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { ChessEngine } from "../../chess-engine/core/ChessEngine";
import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { TurnAdvancedEvent } from "../../chess-engine/events/EventRegistry";
import { hashState } from "../../chess-engine/state/Zobrist";

type BoundFlag = "exact" | "lower" | "upper";

interface TTEntry {
    depth: number;
    score: number;
    flag: BoundFlag;
    bestMove?: Move;
}

export interface EfficientAIOptions {
    depth?: number;
    timeLimitMs?: number;
    ttSize?: number;
}

/**
 * A more efficient AI with basic alpha-beta, transposition table, move ordering,
 * and an optional time budget.
 */
export class EfficientAI implements AI {
    private readonly ruleset: RuleSet;
    private readonly maxDepth: number;
    private readonly timeLimitMs: number;
    private readonly ttSize: number;
    private readonly tt = new Map<bigint, TTEntry>();
    private readonly ttQueue: bigint[] = [];

    constructor(ruleset: RuleSet, options: EfficientAIOptions = {}) {
        this.ruleset = ruleset;
        this.maxDepth = Math.max(1, options.depth ?? 4);
        this.timeLimitMs = Math.max(50, options.timeLimitMs ?? 500);
        this.ttSize = Math.max(1000, options.ttSize ?? 100_000);
    }

    getMove(state: GameState, legalMoves: Move[]): Move | null {
        if (legalMoves.length === 0) return null;

        const start = performance.now();
        let bestMove: Move | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        // Iterative deepening until depth cap or time budget exceeded
        for (let depth = 1; depth <= this.maxDepth; depth++) {
            const result = this.negamax(state, depth, Number.NEGATIVE_INFINITY / 2, Number.POSITIVE_INFINITY / 2, start);
            if (result.timedOut) break;
            if (result.bestMove) {
                bestMove = result.bestMove;
                bestScore = result.score;
            }
        }

        return bestMove ?? legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    private negamax(
        state: GameState,
        depth: number,
        alpha: number,
        beta: number,
        startTime: number
    ): { score: number; bestMove?: Move; timedOut?: boolean } {
        const alphaOrig = alpha;

        if (this.isTimedOut(startTime)) {
            return { score: this.evalFromSideToMove(state), timedOut: true };
        }

        // Terminal check
        const terminal = ChessEngine.isGameOver(state, this.ruleset);
        if (terminal.over) {
            const winner = terminal.winner;
            const score = winner === null ? 0 : (winner === state.currentPlayer ? Infinity : -Infinity);
            return { score };
        }

        if (depth === 0) {
            return { score: this.evalFromSideToMove(state) };
        }

        const hash = hashState(state);
        const ttHit = this.tt.get(hash);
        if (ttHit && ttHit.depth >= depth) {
            if (ttHit.flag === "exact") return { score: ttHit.score, bestMove: ttHit.bestMove };
            if (ttHit.flag === "lower" && ttHit.score > alpha) alpha = ttHit.score;
            else if (ttHit.flag === "upper" && ttHit.score < beta) beta = ttHit.score;
            if (alpha >= beta) return { score: ttHit.score, bestMove: ttHit.bestMove };
        }

        let bestMove: Move | undefined;
        let value = Number.NEGATIVE_INFINITY;

        const moves = this.generateMoves(state);
        if (moves.length === 0) return { score: this.evalFromSideToMove(state) };

        // Move ordering: captures first (simple heuristic)
        moves.sort((a, b) => {
            const aCap = this.isCapture(state, a) ? 1 : 0;
            const bCap = this.isCapture(state, b) ? 1 : 0;
            return bCap - aCap;
        });

        for (const move of moves) {
            const child = this.simulateTurn(state, move);
            const result = this.negamax(child, depth - 1, -beta, -alpha, startTime);
            if (result.timedOut) {
                return { score: this.evalFromSideToMove(state), timedOut: true };
            }
            const score = -result.score;
            if (score > value) {
                value = score;
                bestMove = move;
            }
            if (score > alpha) alpha = score;
            if (alpha >= beta) break; // cutoff
        }

        const flag: BoundFlag =
            value <= alphaOrig ? "upper" : value >= beta ? "lower" : "exact";
        this.storeTT(hash, { depth, score: value, flag, bestMove });

        return { score: value, bestMove };
    }

    private generateMoves(state: GameState): Move[] {
        const allMoves: Move[] = [];
        for (const piece of state.board.getAllPieces(state.currentPlayer)) {
            const moves = ChessEngine.getLegalMoves(state, piece, this.ruleset);
            allMoves.push(...moves);
        }
        return allMoves;
    }

    private simulateTurn(state: GameState, move: Move): GameState {
        const moveResult = ChessEngine.resolveMove(state.clone(), move);
        let newState = moveResult.finalState;
        const nextPlayer = state.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const turnAdvancedEvent = new TurnAdvancedEvent(nextPlayer, state.turnNumber + 1);
        const turnResult = ChessEngine.resolveEvent(newState, turnAdvancedEvent);
        return turnResult.finalState;
    }

    private isCapture(state: GameState, move: Move): boolean {
        return !!state.board.getPieceAt(move.to);
    }

    private isTimedOut(start: number): boolean {
        return performance.now() - start >= this.timeLimitMs;
    }

    private evalFromSideToMove(state: GameState): number {
        let score = 0;
        for (const piece of state.board.getAllPieces()) {
            const val = this.getPieceValue(piece);
            if (piece.owner === PlayerColor.White) score += val;
            else score -= val;
        }
        return state.currentPlayer === PlayerColor.White ? score : -score;
    }

    private getPieceValue(piece: any): number {
        if (typeof piece.getValue === "function") {
            return piece.getValue();
        }
        const name = piece.name?.toLowerCase() || "";
        if (name.includes("king")) return 1000;
        if (name.includes("queen")) return 9;
        if (name.includes("rook")) return 5;
        if (name.includes("bishop")) return 3;
        if (name.includes("knight")) return 3;
        if (name.includes("pawn")) return 1;
        return 1;
    }

    private storeTT(hash: bigint, entry: TTEntry): void {
        if (!this.tt.has(hash) && this.tt.size >= this.ttSize) {
            const evict = this.ttQueue.shift();
            if (evict !== undefined) {
                this.tt.delete(evict);
            }
        }
        if (!this.tt.has(hash)) this.ttQueue.push(hash);
        this.tt.set(hash, entry);
    }
}


