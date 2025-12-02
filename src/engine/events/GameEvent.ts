import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Piece } from "../pieces/Piece";
import { Tile } from "../tiles/Tile";

/**
 * Represents a piece or tile referenced by an event that needs validation.
 */
export type ReferencedActor =
    | { type: "piece"; piece: Piece; expectedPosition: Vector2Int }
    | { type: "tile"; tile: Tile; expectedPosition: Vector2Int };

/**
 * Base class for all events in the system.
 * Immutable, with a clear source and description.
 */
export abstract class GameEvent {
    readonly id: string;
    readonly sourceId: string;
    readonly actor: PlayerColor;
    readonly isPlayerAction: boolean;
    readonly description: string;

    constructor(params: {
        actor: PlayerColor;
        isPlayerAction?: boolean;
        description: string;
        sourceId: string;
    }) {
        this.id = crypto.randomUUID();
        this.actor = params.actor;
        this.isPlayerAction = params.isPlayerAction ?? false;
        this.description = params.description ?? "";
        this.sourceId = params.sourceId;
    }

    /**
     * Returns all pieces and tiles referenced by this event and their expected positions.
     * Used for validation against current state to ensure actors still exist and are valid.
     * Events that don't reference pieces or tiles should return an empty array.
     */
    abstract getReferencedActors(): ReferencedActor[];
}

// --------------------- Concrete event types ---------------------

export class MoveEvent extends GameEvent {
    readonly from: Vector2Int;
    readonly to: Vector2Int;
    readonly piece: Piece;

    constructor(
        from: Vector2Int,
        to: Vector2Int,
        piece: Piece,
        actor: PlayerColor,
        isPlayerAction: boolean,
        sourceId: string
    ) {
        super({
            actor,
            isPlayerAction,
            description: `${piece.name} moves ${from.toString()} → ${to.toString()}`,
            sourceId,
        });
        this.from = from;
        this.to = to;
        this.piece = piece;
    }

    getReferencedActors(): ReferencedActor[] {
        return [{ type: "piece", piece: this.piece, expectedPosition: this.from }];
    }
}

export class CaptureEvent extends GameEvent {
    readonly attacker: Piece;
    readonly target: Piece;

    constructor(attacker: Piece, target: Piece, actor: PlayerColor, isPlayerAction: boolean) {
        super({
            actor,
            isPlayerAction,
            description: `${attacker.name} captures ${target.name}`,
            sourceId: attacker.id,
        });
        this.attacker = attacker;
        this.target = target;
    }

    getReferencedActors(): ReferencedActor[] {
        return [
            { type: "piece", piece: this.attacker, expectedPosition: this.attacker.position },
            { type: "piece", piece: this.target, expectedPosition: this.target.position },
        ];
    }
}

export class DestroyEvent extends GameEvent {
    readonly target: Piece;

    constructor(target: Piece, reason: string, actor: PlayerColor, sourceId: string) {
        super({
            actor,
            isPlayerAction: false,
            description: `Destroy ${target.name}: ${reason}`,
            sourceId,
        });
        this.target = target;
    }

    getReferencedActors(): ReferencedActor[] {
        return [{ type: "piece", piece: this.target, expectedPosition: this.target.position }];
    }
}

export class TurnAdvancedEvent extends GameEvent {
    readonly nextPlayer: PlayerColor;
    readonly turnNumber: number;

    constructor(nextPlayer: PlayerColor, turnNumber: number) {
        super({
            actor: nextPlayer,
            isPlayerAction: false,
            description: `Turn ${turnNumber} → ${nextPlayer}`,
            sourceId: "",
        });
        this.nextPlayer = nextPlayer;
        this.turnNumber = turnNumber;
    }

    getReferencedActors(): ReferencedActor[] {
        return [];
    }
}

export class TurnStartEvent extends GameEvent {
    readonly player: PlayerColor;
    readonly turnNumber: number;

    constructor(player: PlayerColor, turnNumber: number) {
        super({
            actor: player,
            isPlayerAction: false,
            description: `Turn ${turnNumber} start for ${player}`,
            sourceId: "",
        });
        this.player = player;
        this.turnNumber = turnNumber;
    }

    getReferencedActors(): ReferencedActor[] {
        return [];
    }
}

export class TurnEndEvent extends GameEvent {
    readonly player: PlayerColor;
    readonly turnNumber: number;

    constructor(player: PlayerColor, turnNumber: number) {
        super({
            actor: player,
            isPlayerAction: false,
            description: `Turn ${turnNumber} end for ${player}`,
            sourceId: "",
        });
        this.player = player;
        this.turnNumber = turnNumber;
    }

    getReferencedActors(): ReferencedActor[] {
        return [];
    }
}

export class TileChangedEvent extends GameEvent {
    readonly position: Vector2Int;
    readonly newTile: Tile;

    constructor(position: Vector2Int, newTile: Tile, actor: PlayerColor) {
        super({
            actor,
            isPlayerAction: false,
            description: `Tile at ${position.toString()} changed to ${newTile.constructor.name}`,
            sourceId: newTile.id,
        });
        this.position = position;
        this.newTile = newTile;
    }

    getReferencedActors(): ReferencedActor[] {
        // Validate that the position is in bounds (tile exists at that position)
        // We don't need to validate the old tile since we're replacing it
        return [{ type: "tile", tile: this.newTile, expectedPosition: this.position }];
    }
}

export class PieceChangedEvent extends GameEvent {
    readonly oldPiece: Piece;
    readonly newPiece: Piece;
    readonly position: Vector2Int;

    constructor(
        oldPiece: Piece,
        newPiece: Piece,
        position: Vector2Int,
        actor: PlayerColor,
        sourceId: string,
        isPlayerAction = false
    ) {
        super({
            actor,
            isPlayerAction,
            description: `Transform ${oldPiece.name} → ${newPiece.name} at ${position.toString()}`,
            sourceId,
        });
        this.oldPiece = oldPiece;
        this.newPiece = newPiece;
        this.position = position;
    }

    getReferencedActors(): ReferencedActor[] {
        return [{ type: "piece", piece: this.oldPiece, expectedPosition: this.position }];
    }
}
