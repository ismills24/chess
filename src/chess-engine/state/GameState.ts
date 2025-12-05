import { Board } from "./Board";
import { Move } from "../primitives/Move";
import { PlayerColor } from "../primitives/PlayerColor";

/**
 * Immutable snapshot of the current game state.
 * Each GameState represents a single moment in time.
 * 
 * Note: GameState includes turnNumber as required for abilities that trigger on specific turns.
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
        return new GameState(
            this.board.clone(),
            this.currentPlayer,
            this.turnNumber,
            [...this.moveHistory]
        );
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
}



