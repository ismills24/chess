import { Piece } from "../Piece";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";

/**
 * Abstract base for decorators that wrap another Piece
 * and optionally intercept events.
 */
export abstract class PieceDecoratorBase implements Piece {
    readonly id: string;
    protected inner: Piece;

    constructor(inner: Piece, id?: string) {
        this.inner = inner;
        this.id = id ?? this.generateDescriptiveId();
    }

    get name(): string {
        return this.inner.name;
    }

    get owner(): PlayerColor {
        return this.inner.owner;
    }

    get position(): Vector2Int {
        return this.inner.position;
    }
    set position(pos: Vector2Int) {
        this.inner.position = pos;
    }

    get movesMade(): number {
        return this.inner.movesMade;
    }
    set movesMade(v: number) {
        this.inner.movesMade = v;
    }

    get capturesMade(): number {
        return this.inner.capturesMade;
    }
    set capturesMade(v: number) {
        this.inner.capturesMade = v;
    }

    getPseudoLegalMoves(state: GameState): Move[] {
        return this.inner.getPseudoLegalMoves(state);
    }

    getValue(): number {
        return this.inner.getValue();
    }

    clone(): Piece {
        return this.createDecoratorClone(this.inner.clone());
    }

    protected abstract createDecoratorClone(inner: Piece): Piece;

    toString(): string {
        return `${this.constructor.name}(${this.inner.toString()})`;
    }

    get innerPiece(): Piece {
        return this.inner;
    }

    private generateDescriptiveId(): string {
        const decoratorName = this.constructor.name.replace('Decorator', '').toLowerCase();
        const innerName = this.inner.name.toLowerCase();
        const colorPrefix = this.inner.owner === "White" ? "W" : "B";
        const uuid = crypto.randomUUID().substring(0, 8); // Use first 8 chars for uniqueness
        return `${colorPrefix}-${innerName}-${decoratorName}-${uuid}`;
    }
}
