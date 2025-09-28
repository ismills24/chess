import { Piece } from "./Piece";
import { PieceDecoratorBase } from "./decorators/PieceDecoratorBase";

/**
 * Walks a decorator chain to compute total value for a piece.
 */
export class PieceValueCalculator {
    static getTotalValue(piece: Piece): number {
        let value = 0;
        let current: Piece | null = piece;

        while (current) {
            value += current.getValue();
            if (current instanceof PieceDecoratorBase) {
                current = current.inner;
            } else {
                break;
            }
        }

        return value;
    }
}
