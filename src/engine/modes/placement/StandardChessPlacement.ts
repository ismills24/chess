import { PiecePlacement } from "./PiecePlacement";
import { Board } from "../../board/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Rook } from "../../pieces/standard/Rook";
import { Knight } from "../../pieces/standard/Knight";
import { Bishop } from "../../pieces/standard/Bishop";
import { Queen } from "../../pieces/standard/Queen";
import { King } from "../../pieces/standard/King";
import { Pawn } from "../../pieces/standard/Pawn";

/**
 * Standard chess piece placement.
 */
export class StandardChessPlacement implements PiecePlacement {
    placePieces(board: Board, color: PlayerColor): void {
        const mainRank = color === PlayerColor.White ? 0 : 7;
        const pawnRank = color === PlayerColor.White ? 1 : 6;

        board.placePiece(new Rook(color, new Vector2Int(0, mainRank)), new Vector2Int(0, mainRank));
        board.placePiece(new Knight(color, new Vector2Int(1, mainRank)), new Vector2Int(1, mainRank));
        board.placePiece(new Bishop(color, new Vector2Int(2, mainRank)), new Vector2Int(2, mainRank));
        board.placePiece(new Queen(color, new Vector2Int(3, mainRank)), new Vector2Int(3, mainRank));
        board.placePiece(new King(color, new Vector2Int(4, mainRank)), new Vector2Int(4, mainRank));
        board.placePiece(new Bishop(color, new Vector2Int(5, mainRank)), new Vector2Int(5, mainRank));
        board.placePiece(new Knight(color, new Vector2Int(6, mainRank)), new Vector2Int(6, mainRank));
        board.placePiece(new Rook(color, new Vector2Int(7, mainRank)), new Vector2Int(7, mainRank));

        for (let x = 0; x < 8; x++) {
            board.placePiece(new Pawn(color, new Vector2Int(x, pawnRank)), new Vector2Int(x, pawnRank));
        }
    }
}
