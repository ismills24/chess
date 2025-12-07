import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent, CaptureEvent, PieceChangedEvent } from "../../chess-engine/events/EventRegistry";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Pawn } from "../pieces/standard/Pawn";
import { Knight } from "../pieces/standard/Knight";
import { Bishop } from "../pieces/standard/Bishop";
import { Rook } from "../pieces/standard/Rook";
import { Queen } from "../pieces/standard/Queen";
import { AbilityBase as AbilityDecorator } from "./AbilityBase";

const EVOLUTION_CHAIN = ["Pawn", "Knight", "Bishop", "Rook", "Queen"] as const;
type EvolvableName = (typeof EVOLUTION_CHAIN)[number];

function createPieceByName(name: EvolvableName, owner: PlayerColor, position: any): Piece {
    switch (name) {
        case "Pawn": return new Pawn(owner, position);
        case "Knight": return new Knight(owner, position);
        case "Bishop": return new Bishop(owner, position);
        case "Rook": return new Rook(owner, position);
        case "Queen": return new Queen(owner, position);
    }
}

/**
 * Predator evolves up a fixed chain on each capture:
 * Pawn → Knight → Bishop → Rook → Queen.
 */
export class PredatorAbility extends AbilityBase implements Listener {
    readonly priority = 1;
    protected readonly abilityValue = 3;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    /**
     * After a capturing move, evolve to the next piece in the chain.
     * Trigger after the MoveEvent so the piece is already on its destination.
     */
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        if (!(event instanceof MoveEvent)) return [];

        // Is this our piece that just moved?
        const movedPiece = ctx.state.board.getPieceAt(event.to);
        if (!movedPiece || movedPiece.id !== this.id) return [];

        // Did this move perform a capture earlier in the same resolution?
        const captured = ctx.eventLog.some(
            (e) =>
                e instanceof CaptureEvent &&
                e.attacker.id === this.id &&
                e.target.position.equals(event.to)
        );
        if (!captured) return [];

        const currentName = this.name as EvolvableName;
        const currentIndex = EVOLUTION_CHAIN.indexOf(currentName);
        const nextName = EVOLUTION_CHAIN[currentIndex + 1];
        if (!nextName) return []; // already at top of chain

        // Build the new base piece
        const nextBase = createPieceByName(nextName, this.owner, event.to);
        nextBase.movesMade = this.movesMade;
        nextBase.capturesMade = this.capturesMade;

        // Rebuild decorator chain replacing the base with the upgraded piece, keeping other abilities intact.
        const rebuilt = this.rebuildChain(this.innerPiece, nextBase);
        const upgraded = new PredatorAbility(rebuilt, this.id);

        return [
            new PieceChangedEvent(
                this,
                upgraded,
                event.to,
                event.actor,
                this.id,
                event.isPlayerAction,
                "predator-evolve"
            ),
        ];
    }

    private rebuildChain(piece: Piece, newBase: Piece): Piece {
        // Replace deepest base piece while preserving existing decorators inside this ability.
        if (piece instanceof AbilityDecorator) {
            const innerRebuilt = this.rebuildChain(piece.innerPiece, newBase);
            return piece.createAbilityClone(innerRebuilt);
        }
        return newBase;
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new PredatorAbility(inner, this.id);
    }
}


