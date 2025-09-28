import { Board } from "../../board/Board";
import { PlayerColor } from "../../primitives/PlayerColor";

/**
 * Defines how to place starting pieces for a given game mode.
 */
export interface PiecePlacement {
  placePieces(board: Board, color: PlayerColor): void;
}
