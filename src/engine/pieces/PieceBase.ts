import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { Piece } from "./Piece";

/**
 * Base class for all pieces providing default behavior.
 * Concrete pieces should inherit from this and override movement/value.
 */
export abstract class PieceBase implements Piece {
    readonly id: string;
    readonly name: string;
    readonly owner: PlayerColor;
    position: Vector2Int;
    movesMade: number;
    capturesMade: number;

    protected constructor(
        name: string,
        owner: PlayerColor,
        position: Vector2Int,
        id?: string,
        movesMade: number = 0,
        capturesMade: number = 0
    ) {
        this.id = id ?? crypto.randomUUID();
        this.name = name;
        this.owner = owner;
        this.position = position;
        this.movesMade = movesMade;
        this.capturesMade = capturesMade;
    }

    // ---------------- Movement ----------------
    abstract getPseudoLegalMoves(state: GameState): Move[];

    // ---------------- Value & Cloning ----------------
    abstract getValue(): number;

    clone(): Piece {
        // By default, create a shallow copy with same identity and counters.
        // Subclasses can override to preserve decorator chains, etc.
        return Object.assign(
            Object.create(Object.getPrototypeOf(this)),
            this
        );
    }

    toString(): string {
        return `${this.name} (${this.owner}) at ${this.position}`;
    }

    incrementMoves(): void {
        this.movesMade++;
    }

    incrementCaptures(): void {
        this.capturesMade++;
    }
}
