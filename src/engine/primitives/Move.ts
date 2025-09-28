import { Vector2Int } from "./Vector2Int";
import { IPiece } from "../pieces/IPiece";

/**
 * Represents a single attempted move of a piece.
 * Note: this is a proposition until confirmed by the Runner.
 */
export class Move {
    readonly from: Vector2Int;
    readonly to: Vector2Int;
    readonly piece: IPiece;
    readonly isCapture: boolean;

    constructor(
        from: Vector2Int,
        to: Vector2Int,
        piece: IPiece,
        isCapture: boolean = false
    ) {
        this.from = from;
        this.to = to;
        this.piece = piece;
        this.isCapture = isCapture;
    }
}
