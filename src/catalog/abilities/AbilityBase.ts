import { Piece } from "../pieces/Piece";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves, MovementRestrictions } from "../../chess-engine";

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

    get entityId(): string {
        // Delegate to inner; fall back to our own id
        return (this.inner as any).entityId ?? this.inner.id;
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

    /**
    * Returns true if the provided piece (possibly decorated) contains the given entityId
    * somewhere in its decorator chain.
    */
    protected chainContainsEntity(piece: any, entityId: string): boolean {
        let current: any = piece;
        while (current) {
            if ((current as any).entityId === entityId || (current as any).id === entityId) return true;
            if ((current as any).innerPiece) {
                current = (current as any).innerPiece;
            } else {
                break;
            }
        }
        return false;
    }

    /**
    * Helper to get the stable entity id from any piece/decorator.
    */
    protected getEntityId(piece: any): string {
        return piece?.entityId ?? piece?.id;
    }

    private generateDescriptiveId(): string {
        const abilityName = this.constructor.name.replace('Ability', '').toLowerCase();
        const innerName = this.inner.name.toLowerCase();
        const colorPrefix = this.inner.owner === PlayerColor.White ? "W" : "B";
        const uuid = crypto.randomUUID().substring(0, 8);
        return `${colorPrefix}-${innerName}-${abilityName}-${uuid}`;
    }
}



