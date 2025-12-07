import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent, CaptureEvent, DestroyEvent, PieceChangedEvent } from "../../chess-engine/events/EventRegistry";
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
    readonly priority = 2;
    protected readonly abilityValue = 3;
    private readonly baseEntityId: string;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
        this.baseEntityId = (inner as any).entityId ?? inner.id;
    }

    /**
     * Evolve after any kill:
     * - Melee: after the MoveEvent if a CaptureEvent by this piece occurred earlier in the resolution.
     * - Ranged (Marksman conversion): immediately on DestroyEvent with sourceId === this.id.
     */
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Ranged kill path: DestroyEvent tagged with attacker id (Marksman conversion)
        if (event instanceof DestroyEvent) {
            const attacker = ctx.state.board.getAllPieces().find((p) => this.getEntityId(p) === event.sourceId);
            if (attacker && this.chainContainsEntity(attacker, this.id)) {
                console.log("[Predator] evolve on destroy", {
                    attackerId: this.getEntityId(attacker),
                    pos: attacker.position.toString(),
                    eventActor: event.actor,
                });
                return this.evolve(attacker, attacker.position, event.actor, event.isPlayerAction);
            }
        }

        // Melee path: evolve on the MoveEvent that followed a CaptureEvent by this attacker
        if (event instanceof MoveEvent && this.chainContainsEntity(event.piece, this.id)) {
            const moverEntityId = this.getEntityId(event.piece);
            const wasCapture = ctx.eventLog.some(
                (e) =>
                    e instanceof CaptureEvent &&
                    this.getEntityId(e.attacker) === moverEntityId &&
                    e.target.position.equals(event.to)
            );
            if (!wasCapture) return [];

            const topPiece = ctx.state.board.getPieceAt(event.to) as any;
            if (!topPiece) return [];

            console.log("[Predator] evolve on move", {
                moverEntityId,
                to: event.to.toString(),
                actor: event.actor,
            });
            return this.evolve(topPiece, event.to, event.actor, event.isPlayerAction);
        }

        return [];
    }

    private replaceBaseInChain(piece: any, newBase: Piece): Piece {
        if (piece instanceof AbilityDecorator) {
            const innerRebuilt = this.replaceBaseInChain((piece as any).innerPiece, newBase);
            return this.cloneAbilityLayer(piece as any, innerRebuilt);
        }
        return newBase;
    }

    private findSelfOnBoard(ctx: ListenerContext): Piece | null {
        for (const p of ctx.state.board.getAllPieces()) {
            if (this.chainContainsEntity(p, this.id)) return p as any;
        }
        return null;
    }

    private evolve(topPiece: any, pos: any, actor: PlayerColor, isPlayerAction: boolean): GameEvent[] {
        const currentName = this.name as EvolvableName;
        const currentIndex = EVOLUTION_CHAIN.indexOf(currentName);
        const nextName = EVOLUTION_CHAIN[currentIndex + 1];
        if (!nextName) return []; // already at top

        const nextBase = createPieceByName(nextName, topPiece.owner, pos);
        nextBase.movesMade = topPiece.movesMade;
        nextBase.capturesMade = topPiece.capturesMade;

        const upgradedTop = this.replaceBaseInChain(topPiece, nextBase);

        return [
            new PieceChangedEvent(
                topPiece,
                upgradedTop,
                pos,
                actor,
                this.id,
                isPlayerAction,
                "predator-evolve"
            ),
        ];
    }

    private rebuildChain(piece: Piece, newBase: Piece): Piece {
        // Replace deepest base piece while preserving existing decorators inside this ability.
        if (piece instanceof AbilityDecorator) {
            const innerRebuilt = this.rebuildChain(piece.innerPiece, newBase);
            return (piece as PredatorAbility).createAbilityClone(innerRebuilt);
        }
        return newBase;
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new PredatorAbility(inner, this.id);
    }

    private cloneAbilityLayer(layer: AbilityDecorator, inner: Piece): Piece {
        return (layer as any).createAbilityClone(inner);
    }
}


