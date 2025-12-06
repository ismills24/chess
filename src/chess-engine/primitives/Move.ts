import { Vector2Int } from "./Vector2Int";
import { Piece } from "../state/types";

/**
 * Represents a single attempted move of a piece.
 * Note: this is a proposition until confirmed by the engine.
 */

export enum MoveType {
    SLIDE = "SLIDE",
    JUMP = "JUMP",
}

export class Move {
    readonly from: Vector2Int;
    readonly to: Vector2Int;
    readonly piece: Piece;
    readonly isCapture: boolean;
    readonly type: MoveType = MoveType.SLIDE;

    constructor(
        from: Vector2Int,
        to: Vector2Int,
        piece: Piece,
        isCapture: boolean = false,
        type: MoveType = MoveType.SLIDE
    ) {
        this.from = from;
        this.to = to;
        this.piece = piece;
        this.isCapture = isCapture;
        this.type = type;
    }
}

