import { Piece } from "../pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Move } from "../../chess-engine/primitives/Move";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves, MovementRestrictions } from "../../chess-engine/rules/MovementPatterns";

/**
 * Abstract base for abilities that wrap another Piece.
 * Abilities can implement Listener to intercept/modify events.
 * 
 * This replaces PieceDecoratorBase - same wrapping pattern, different interface.
 */
export abstract class AbilityBase implements Piece {
    readonly id: string;
    protected inner: Piece;
    protected abstract readonly abilityValue: number;

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

    getCandidateMoves(state: GameState): CandidateMoves {
        return this.inner.getCandidateMoves(state);
    }

    getValue(): number {
        return this.inner.getValue() + this.abilityValue;
    }

    clone(): Piece {
        return this.createAbilityClone(this.inner.clone());
    }

    protected abstract createAbilityClone(inner: Piece): Piece;

    toString(): string {
        return `${this.constructor.name}(${this.inner.toString()})`;
    }

    get innerPiece(): Piece {
        return this.inner;
    }

    public getRestrictedSquares(state: GameState): MovementRestrictions | null {
        return this.inner.getRestrictedSquares?.(state) ?? null;
    }

    private generateDescriptiveId(): string {
        const abilityName = this.constructor.name.replace('Ability', '').toLowerCase();
        const innerName = this.inner.name.toLowerCase();
        const colorPrefix = this.inner.owner === PlayerColor.White ? "W" : "B";
        const uuid = crypto.randomUUID().substring(0, 8);
        return `${colorPrefix}-${innerName}-${abilityName}-${uuid}`;
    }
}


