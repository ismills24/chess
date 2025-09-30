import { Board } from "../board/Board";
import { Move } from "../primitives/Move";
import { PlayerColor } from "../primitives/PlayerColor";
import { RuleSet } from "../rules/RuleSet";
import { Vector2Int } from "../primitives/Vector2Int";
import { PieceValueCalculator } from "../pieces/PieceValueCalculator";
import { MovementRestrictions } from "../pieces/MovementHelper";

/**
 * Immutable snapshot of the current game state.
 * Each GameState represents a single moment in time.
 */
export class GameState {
    readonly board: Board;
    readonly currentPlayer: PlayerColor;
    readonly turnNumber: number;
    readonly moveHistory: readonly Move[];

    constructor(
        board: Board,
        currentPlayer: PlayerColor,
        turnNumber: number,
        moveHistory: Move[] = []
    ) {
        this.board = board;
        this.currentPlayer = currentPlayer;
        this.turnNumber = turnNumber;
        this.moveHistory = Object.freeze([...moveHistory]);
    }

    static createInitial(board: Board, startPlayer: PlayerColor): GameState {
        return new GameState(board, startPlayer, 1, []);
    }

    clone(): GameState {
        return new GameState(this.board.clone(), this.currentPlayer, this.turnNumber, [
            ...this.moveHistory,
        ]);
    }

    withUpdatedState(params: {
        board?: Board;
        currentPlayer?: PlayerColor;
        turnNumber?: number;
        additionalMove?: Move;
    }): GameState {
        const newBoard = params.board ?? this.board.clone();
        const newCurrentPlayer = params.currentPlayer ?? this.currentPlayer;
        const newTurnNumber = params.turnNumber ?? this.turnNumber;

        const newHistory = [...this.moveHistory];
        if (params.additionalMove) newHistory.push(params.additionalMove);

        return new GameState(newBoard, newCurrentPlayer, newTurnNumber, newHistory);
    }

    /**
     * Simulate a move and return a new GameState.
     * Returns null if the move is illegal.
     */
    simulate(move: Move, ruleset: RuleSet): GameState | null {
        const piece = this.board.getPieceAt(move.from);
        if (!piece) return null;

        const legalMoves = ruleset.getLegalMoves(this, piece);
        if (!legalMoves.some((m) => m.from.equals(move.from) && m.to.equals(move.to))) {
            return null;
        }

        const clonedState = this.clone();
        const clonedBoard = clonedState.board;

        const clonedPiece = clonedBoard.getPieceAt(move.from);
        if (!clonedPiece) return null;

        const target = clonedBoard.getPieceAt(move.to);
        if (target) clonedBoard.removePiece(move.to);

        clonedBoard.movePiece(move.from, move.to);
        clonedPiece.position = move.to;

        const newHistory = [...this.moveHistory, move];
        return new GameState(clonedBoard, this.currentPlayer, this.turnNumber, newHistory);
    }

    /**
     * Evaluate position for AI: positive = good for White, negative = good for Black.
     */
    evaluate(): number {
        let score = 0;
        for (let x = 0; x < this.board.width; x++) {
            for (let y = 0; y < this.board.height; y++) {
                const pos = new Vector2Int(x, y);
                const piece = this.board.getPieceAt(pos);
                if (!piece) continue;

                const v = PieceValueCalculator.getTotalValue(piece);
                score += piece.owner === PlayerColor.White ? v : -v;
            }
        }
        return score;
    }

    /**
     * Get all movement restrictions for current player.
     */
    getAllMovementRestrictions(): MovementRestrictions[] {
        const results: MovementRestrictions[] = [];
        // add restrictions from tiles
        for (const tile of (this.board.tiles).flat()) {
            const restrictions = tile.getRestrictedSquares(this);
            if (restrictions) {
                results.push(restrictions);
            }
        }
        // add restrictions from pieces
        for (const piece of this.board.getAllPieces(this.currentPlayer)) {
            const restrictions = piece.getRestrictedSquares(this);
            if (restrictions) {
                results.push(restrictions);
            }
        }
        console.log('results', results);
        return results;
    }

    /**
     * Get all legal moves for current player.
     */
    getAllLegalMoves(ruleset: RuleSet): Move[] {
        const results: Move[] = [];
        for (const piece of this.board.getAllPieces(this.currentPlayer)) {
            results.push(...ruleset.getLegalMoves(this, piece));
        }
        return results;
    }
}
