import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Piece, Tile } from "../state/types";

/**
 * Base class for all events in the system.
 * Immutable, with a clear source and description.
 * 
 * Note: Renamed from GameEvent to Event for the new architecture.
 */
export abstract class Event {
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
}

// --------------------- Concrete event types ---------------------

export class MoveEvent extends Event {
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
}

export class CaptureEvent extends Event {
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
}

export class DestroyEvent extends Event {
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
}

export class TurnAdvancedEvent extends Event {
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
}

export class TurnStartEvent extends Event {
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
}

export class TurnEndEvent extends Event {
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
}

export class TileChangedEvent extends Event {
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
}

export class PieceChangedEvent extends Event {
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
}

export class TimeOutEvent extends Event {
    readonly expiredPlayer: PlayerColor;

    constructor(expiredPlayer: PlayerColor, sourceId: string = "") {
        super({
            actor: expiredPlayer,
            isPlayerAction: false,
            description: `Time expired for ${expiredPlayer}`,
            sourceId,
        });
        this.expiredPlayer = expiredPlayer;
    }
}

export class GameOverEvent extends Event {
    readonly losingPlayer: PlayerColor;

    constructor(losingPlayer: PlayerColor, sourceId: string = "") {
        const winner = losingPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        super({
            actor: losingPlayer,
            isPlayerAction: false,
            description: `Game Over - ${losingPlayer} loses, ${winner} wins`,
            sourceId,
        });
        this.losingPlayer = losingPlayer;
    }
}

