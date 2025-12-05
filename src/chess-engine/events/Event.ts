import { PlayerColor } from "../primitives/PlayerColor";
import { Vector2Int } from "../primitives/Vector2Int";
import { Piece, Tile } from "../state/types";

import { GameState } from "../state/GameState";

/**
 * Base class for all events in the system.
 * Immutable, with a clear source and description.
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

    /**
     * Check if this event is still valid given the current state.
     * Used to filter out events that target pieces/tiles that no longer exist.
     * 
     * @param state - Current game state
     * @returns True if the event is still valid and should be applied
     */
    abstract isStillValid(state: GameState): boolean;
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

    isStillValid(state: GameState): boolean {
        // Check that the piece still exists at the from position
        const pieceAtFrom = state.board.getPieceAt(this.from);
        if (!pieceAtFrom) {
            return false;
        }
        // Check that it's the same piece (by ID)
        if (pieceAtFrom.id !== this.piece.id) {
            return false;
        }
        return true;
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

    isStillValid(state: GameState): boolean {
        // Check that the attacker still exists at its position
        const attackerAtPos = state.board.getPieceAt(this.attacker.position);
        if (!attackerAtPos || attackerAtPos.id !== this.attacker.id) {
            return false;
        }
        // Check that the target still exists at its position
        const targetAtPos = state.board.getPieceAt(this.target.position);
        if (!targetAtPos || targetAtPos.id !== this.target.id) {
            return false;
        }
        return true;
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

    isStillValid(state: GameState): boolean {
        // Check that the target still exists at its position
        const targetAtPos = state.board.getPieceAt(this.target.position);
        if (!targetAtPos) {
            return false;
        }
        // Check that it's the same piece (by ID)
        if (targetAtPos.id !== this.target.id) {
            return false;
        }
        return true;
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

    isStillValid(state: GameState): boolean {
        // Turn events are always valid (informational)
        return true;
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

    isStillValid(state: GameState): boolean {
        // Turn events are always valid (informational)
        return true;
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

    isStillValid(state: GameState): boolean {
        // Turn events are always valid (informational)
        return true;
    }
}

export class TileChangedEvent extends Event {
    readonly position: Vector2Int;
    readonly oldTile: Tile;
    readonly newTile: Tile;

    constructor(position: Vector2Int, oldTile: Tile, newTile: Tile, actor: PlayerColor) {
        super({
            actor,
            isPlayerAction: false,
            description: `Tile at ${position.toString()} changed from ${oldTile.constructor.name} to ${newTile.constructor.name}`,
            sourceId: newTile.id,
        });
        this.position = position;
        this.oldTile = oldTile;
        this.newTile = newTile;
    }

    isStillValid(state: GameState): boolean {
        // Check that the position is in bounds
        if (!state.board.isInBounds(this.position)) {
            return false;
        }
        // Check that the current tile matches the expected old tile
        const currentTile = state.board.getTile(this.position);
        if (!currentTile) {
            return false;
        }
        // Check that it's the same tile (by ID)
        if (currentTile.id !== this.oldTile.id) {
            return false;
        }
        return true;
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

    isStillValid(state: GameState): boolean {
        // Check that the old piece still exists at the position
        const pieceAtPos = state.board.getPieceAt(this.position);
        if (!pieceAtPos) {
            return false;
        }
        // Check that it's the same piece (by ID)
        if (pieceAtPos.id !== this.oldPiece.id) {
            return false;
        }
        return true;
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

    isStillValid(state: GameState): boolean {
        // Timeout events are always valid (informational)
        return true;
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

    isStillValid(state: GameState): boolean {
        // Game over events are always valid (informational)
        return true;
    }
}

