import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../chess-engine/state/GameState";
import { Piece } from "./Piece";
import { CandidateMoves, MovementRestrictions } from "../../chess-engine/rules/MovementPatterns";

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
        this.id = id ?? this.generateDescriptiveId(name, owner);
        this.name = name;
        this.owner = owner;
        this.position = position;
        this.movesMade = movesMade;
        this.capturesMade = capturesMade;
    }

    // ---------------- Movement ----------------
    abstract getCandidateMoves(state: GameState): CandidateMoves;

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

    getRestrictedSquares(state: GameState): MovementRestrictions | null {
        return null;
    }

    private generateDescriptiveId(name: string, owner: PlayerColor): string {
        const colorPrefix = owner === PlayerColor.White ? "W" : "B";
        const shortName = name.toLowerCase();
        const uuid = crypto.randomUUID().substring(0, 8);
        return `${colorPrefix}-${shortName}-${uuid}`;
    }
}

