import { GameState } from "../../chess-engine/state/GameState";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { ChessEngine } from "../../chess-engine/core/ChessEngine";
import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { TurnAdvancedEvent } from "../../chess-engine/events/EventRegistry";
import {
    SerializedGameState,
    SerializedMove,
    deserializeGameState,
    deserializeMoveData,
} from "./serialization";
import { StandardChessRuleSet } from "../rulesets/StandardChess";
import { LastPieceStandingRuleSet } from "../rulesets/LastPieceStanding";

/**
 * Message sent to the worker to evaluate a root move.
 */
interface WorkerMessage {
    type: "evaluate";
    serializedState: SerializedGameState;
    serializedMove: SerializedMove;
    depth: number;
    rulesetType: "StandardChess" | "LastPieceStanding";
    moveIndex: number;
}

/**
 * Response from the worker with the evaluation score.
 */
interface WorkerResponse {
    type: "result";
    score: number;
    moveIndex: number;
}

/**
 * Create a ruleset instance from a type string.
 */
function createRuleSet(type: string): RuleSet {
    switch (type) {
        case "LastPieceStanding":
            return new LastPieceStandingRuleSet();
        case "StandardChess":
        default:
            return new StandardChessRuleSet();
    }
}

/**
 * Simulate a turn (move + turn advancement).
 */
function simulateTurn(state: GameState, move: Move): GameState {
    const moveResult = ChessEngine.resolveMove(state, move);
    let newState = moveResult.finalState;

    const nextPlayer =
        state.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
    const turnAdvancedEvent = new TurnAdvancedEvent(nextPlayer, state.turnNumber + 1);
    const turnResult = ChessEngine.resolveEvent(newState, turnAdvancedEvent);

    return turnResult.finalState;
}

/**
 * Evaluate a position from the perspective of the side to move.
 * For LastPieceStanding this is pure material.
 */
function evalFromSideToMove(state: GameState): number {
    let score = 0;
    for (const piece of state.board.getAllPieces()) {
        const value = getPieceValue(piece);
        if (piece.owner === PlayerColor.White) {
            score += value;
        } else {
            score -= value;
        }
    }

    return state.currentPlayer === PlayerColor.White ? score : -score;
}

/**
 * Get the value of a piece for evaluation.
 */
function getPieceValue(piece: any): number {
    if (typeof piece.getValue === "function") {
        return piece.getValue();
    }

    const name = (piece.name ?? "").toLowerCase();
    if (name.includes("king")) return 1000;
    if (name.includes("queen")) return 9;
    if (name.includes("rook")) return 5;
    if (name.includes("bishop")) return 3;
    if (name.includes("knight")) return 3;
    if (name.includes("pawn")) return 1;
    return 1;
}

/**
 * Basic move ordering: captures first, higher-value captures earlier.
 */
function orderMoves(node: GameState, moves: Move[]): Move[] {
    return moves
        .slice()
        .sort((a, b) => {
            const aTarget = node.board.getPieceAt(a.to);
            const bTarget = node.board.getPieceAt(b.to);

            const aCaptureVal = aTarget ? getPieceValue(aTarget) : 0;
            const bCaptureVal = bTarget ? getPieceValue(bTarget) : 0;

            // Sort by capture vs non-capture, then by capture value.
            if (aCaptureVal !== bCaptureVal) {
                return bCaptureVal - aCaptureVal; // higher capture value first
            }
            // If both non-captures, keep relative order.
            return 0;
        });
}

/**
 * Negamax with alpha-beta pruning.
 */
function negamax(
    node: GameState,
    depth: number,
    alpha: number,
    beta: number,
    ruleset: RuleSet
): number {
    if (depth === 0 || isTerminal(node, ruleset)) {
        return evalFromSideToMove(node);
    }

    const allMoves: Move[] = [];
    for (const piece of node.board.getAllPieces(node.currentPlayer)) {
        const moves = ChessEngine.getLegalMoves(node, piece, ruleset);
        allMoves.push(...moves);
    }

    if (allMoves.length === 0) {
        return evalFromSideToMove(node);
    }

    const orderedMoves = orderMoves(node, allMoves);
    let value = Number.NEGATIVE_INFINITY;

    for (const move of orderedMoves) {
        const child = simulateTurn(node, move);
        const score = -negamax(child, depth - 1, -beta, -alpha, ruleset);

        if (score > value) value = score;
        if (value > alpha) alpha = value;
        if (alpha >= beta) break; // alpha-beta cutoff
    }

    return value === Number.NEGATIVE_INFINITY ? evalFromSideToMove(node) : value;
}

/**
 * Check if a state is terminal (game over).
 * For LastPieceStanding this is "no legal moves / last piece dead".
 */
function isTerminal(state: GameState, ruleset: RuleSet): boolean {
    return ChessEngine.isGameOver(state, ruleset).over;
}

/**
 * Handle messages from the main thread.
 */
addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
    const { type, serializedState, serializedMove, depth, rulesetType, moveIndex } = event.data;

    if (type !== "evaluate") return;

    try {
        const state = deserializeGameState(serializedState);
        const moveData = deserializeMoveData(serializedMove);

        const piece = state.board.getPieceAt(moveData.from);
        if (!piece) {
            postMessage({
                type: "result",
                score: Number.NEGATIVE_INFINITY,
                moveIndex,
            } as WorkerResponse);
            return;
        }

        const move = new Move(moveData.from, moveData.to, piece, moveData.isCapture);
        const ruleset = createRuleSet(rulesetType);

        const nextState = simulateTurn(state, move);
        const score = -negamax(
            nextState,
            depth - 1,
            Number.NEGATIVE_INFINITY / 2,
            Number.POSITIVE_INFINITY / 2,
            ruleset
        );

        postMessage({ type: "result", score, moveIndex } as WorkerResponse);
    } catch (error) {
        console.error("Worker error:", error);
        postMessage({
            type: "result",
            score: Number.NEGATIVE_INFINITY,
            moveIndex,
        } as WorkerResponse);
    }
});
