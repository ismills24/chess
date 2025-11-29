import { PieceBase } from "../pieces/PieceBase";
import { PieceDecoratorBase } from "../pieces/decorators/PieceDecoratorBase";
import { PlayerColor } from "./PlayerColor";
import { Vector2Int } from "./Vector2Int";

/**
 * Type representing a piece class constructor that extends PieceBase.
 * All standard pieces (Pawn, Rook, Knight, Bishop, Queen, King) can be used here.
 */
export type PieceClass = new (owner: PlayerColor, position: Vector2Int) => PieceBase;

/**
 * Configuration for a piece, specifying its base type and applied decorators.
 * This is a data structure representing piece configuration, distinct from the game Piece interface.
 * Note: This class is named "Piece" to match the requested structure, but it represents configuration
 * data, not the actual game piece interface (which is also named Piece).
 */
export class Piece {
    readonly basePiece: PieceClass;
    readonly decorators: PieceDecoratorBase[];

    constructor(basePiece: PieceClass, decorators: PieceDecoratorBase[] = []) {
        this.basePiece = basePiece;
        this.decorators = [...decorators]; // Create a copy to prevent external mutation
    }

    /**
     * Creates a copy of this piece configuration.
     * Note: Decorators are shallow copied (same instances) since they require a piece to wrap.
     * If you need deep cloning, you'll need to recreate decorators with a new inner piece.
     */
    clone(): Piece {
        return new Piece(this.basePiece, [...this.decorators]);
    }

    /**
     * Checks if this configuration has a decorator of a specific type.
     */
    hasDecoratorType(decoratorType: new (inner: any, id?: string) => PieceDecoratorBase): boolean {
        return this.decorators.some(d => d instanceof decoratorType);
    }

    /**
     * Adds a decorator to this configuration (returns a new instance).
     */
    withDecorator(decorator: PieceDecoratorBase): Piece {
        // Check if we already have this exact decorator instance or same type
        if (this.decorators.includes(decorator) || this.decorators.some(d => d.constructor === decorator.constructor)) {
            return this; // Already has this decorator
        }
        return new Piece(this.basePiece, [...this.decorators, decorator]);
    }

    /**
     * Removes a decorator from this configuration (returns a new instance).
     */
    withoutDecorator(decorator: PieceDecoratorBase): Piece {
        return new Piece(
            this.basePiece,
            this.decorators.filter(d => d !== decorator)
        );
    }

    /**
     * Removes all decorators of a specific type from this configuration (returns a new instance).
     */
    withoutDecoratorType(decoratorType: new (inner: any, id?: string) => PieceDecoratorBase): Piece {
        return new Piece(
            this.basePiece,
            this.decorators.filter(d => !(d instanceof decoratorType))
        );
    }

    /**
     * Gets the base piece constructor for this configuration.
     */
    get basePieceType(): PieceClass {
        return this.basePiece;
    }

    /**
     * Gets the decorators applied to this configuration.
     */
    get appliedDecorators(): ReadonlyArray<PieceDecoratorBase> {
        return this.decorators;
    }
}

