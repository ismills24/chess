import { AI } from "./AI";
import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { RuleSet } from "../../chess-engine/rules/RuleSet";
import {
    serializeGameState,
    serializeMove,
    SerializedMove,
} from "./serialization";
import { StandardChessRuleSet } from "../rulesets/StandardChess";
import { LastPieceStandingRuleSet } from "../rulesets/LastPieceStanding";
import { GreedyAI } from "./GreedyAI";

interface WorkerMessage {
    type: "evaluate";
    serializedState: any;
    serializedMove: SerializedMove;
    depth: number;
    rulesetType: "StandardChess" | "LastPieceStanding";
    moveIndex: number;
}

interface WorkerResponse {
    type: "result";
    score: number;
    moveIndex: number;
}

/**
 * Parallel AI using web workers for root-parallel negamax.
 * Spawns a small pool of workers and distributes root moves across them.
 */
export class ParallelGreedyAI implements AI {
    private readonly ruleset: RuleSet;
    private readonly depth: number;
    private readonly maxWorkers: number;

    // We only keep this in case you want to call cleanup() manually.
    private workers: Worker[] = [];

    constructor(ruleset: RuleSet, depth: number = 3, maxWorkers: number = 4) {
        this.ruleset = ruleset;
        this.depth = Math.max(1, depth);
        this.maxWorkers = Math.max(1, maxWorkers);
    }

    /**
     * Get the ruleset type string for worker communication.
     */
    private getRulesetType(): "StandardChess" | "LastPieceStanding" {
        if (this.ruleset instanceof LastPieceStandingRuleSet) {
            return "LastPieceStanding";
        } else if (this.ruleset instanceof StandardChessRuleSet) {
            return "StandardChess";
        }
        // Default to LastPieceStanding if that's your main mode.
        return "LastPieceStanding";
    }

    /**
     * Create a worker instance.
     * Vite handles bundling when using new URL with import.meta.url.
     */
    private createWorker(): Worker {
        const workerUrl = new URL("./negamax.worker.ts", import.meta.url);
        const worker = new Worker(workerUrl, { type: "module" });
        this.workers.push(worker);
        return worker;
    }

    /**
     * Clean up workers if you want to explicitly dispose the AI.
     */
    cleanup(): void {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
    }

    getMove(
        state: GameState,
        legalMoves: Move[]
    ): Move | null | Promise<Move | null> {
        if (legalMoves.length === 0) {
            return null;
        }

        // For shallow or tiny trees, the overhead of workers isn't worth it.
        if (legalMoves.length <= 2 || this.depth === 1) {
            return this.getMoveSequential(state, legalMoves);
        }

        return this.getMoveParallel(state, legalMoves);
    }

    /**
     * Sequential fallback using the original GreedyAI.
     */
    private async getMoveSequential(state: GameState, legalMoves: Move[]): Promise<Move | null> {
        const sequentialAI = new GreedyAI(this.ruleset, this.depth);
        return sequentialAI.getMove(state, legalMoves); // already synchronous, but returning as Promise
    }
    

    /**
     * Parallel evaluation using a small worker pool.
     */
    private async getMoveParallel(
        state: GameState,
        legalMoves: Move[]
    ): Promise<Move | null> {
        const serializedState = serializeGameState(state);
        const rulesetType = this.getRulesetType();

        const scores = await this.evaluateMovesWithWorkerPool(
            serializedState,
            rulesetType,
            legalMoves
        );

        // Find best move(s) by score.
        let bestScore = Number.NEGATIVE_INFINITY;
        const bestMoves: Move[] = [];

        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            if (score > bestScore) {
                bestScore = score;
                bestMoves.length = 0;
                bestMoves.push(legalMoves[i]);
            } else if (score === bestScore) {
                bestMoves.push(legalMoves[i]);
            }
        }

        // Random among equally good moves to avoid deterministic weirdness.
        const choice = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        // Terminate workers created during this call.
        this.cleanup();

        return choice ?? null;
    }

    /**
     * Distribute move evaluations over a worker pool.
     */
    private evaluateMovesWithWorkerPool(
        serializedState: any,
        rulesetType: "StandardChess" | "LastPieceStanding",
        moves: Move[]
    ): Promise<number[]> {
        const workerCount = Math.min(this.maxWorkers, moves.length);
        const scores: number[] = new Array(moves.length).fill(
            Number.NEGATIVE_INFINITY
        );

        if (workerCount === 0) {
            return Promise.resolve(scores);
        }

        let nextMoveIndex = 0;
        let completed = 0;

        return new Promise((resolve, reject) => {
            const workers: Worker[] = [];

            const spawnWorker = () => {
                const worker = this.createWorker();
                workers.push(worker);

                worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                    const { type, score, moveIndex } = event.data;
                    if (type !== "result") {
                        // Ignore unknown messages
                        return;
                    }

                    scores[moveIndex] = score;
                    completed++;

                    if (nextMoveIndex < moves.length) {
                        // Dispatch next move to this worker.
                        const idx = nextMoveIndex++;
                        const serializedMove = serializeMove(moves[idx]);
                        const message: WorkerMessage = {
                            type: "evaluate",
                            serializedState,
                            serializedMove,
                            depth: this.depth,
                            rulesetType,
                            moveIndex: idx,
                        };
                        worker.postMessage(message);
                    } else if (completed >= moves.length) {
                        resolve(scores);
                    }
                };

                worker.onerror = (error) => {
                    console.error("Worker error:", error);
                    // Treat all remaining moves as terrible if something explodes.
                    // Still try to resolve rather than hang.
                    completed = moves.length;
                    resolve(scores);
                };

                // Kick off first job for this worker, if any remain.
                if (nextMoveIndex < moves.length) {
                    const idx = nextMoveIndex++;
                    const serializedMove = serializeMove(moves[idx]);
                    const message: WorkerMessage = {
                        type: "evaluate",
                        serializedState,
                        serializedMove,
                        depth: this.depth,
                        rulesetType,
                        moveIndex: idx,
                    };
                    worker.postMessage(message);
                }
            };

            // Spawn the pool
            for (let i = 0; i < workerCount; i++) {
                spawnWorker();
            }
        });
    }
}
