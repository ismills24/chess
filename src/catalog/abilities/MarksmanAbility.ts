import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Move } from "../../chess-engine/primitives/Move";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves } from "../../chess-engine/rules/MovementPatterns";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent, DestroyEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";

/**
 * Allows the piece to capture enemies at a distance without moving.
 * Consumes charges for ranged attacks.
 */
export class MarksmanAbility extends AbilityBase implements Listener {
    private rangedAttacksLeft: number = 1;
    readonly priority = 0;
    protected readonly abilityValue = 4;

    constructor(inner: Piece, id?: string, charges = 1) {
        super(inner, id);
        this.rangedAttacksLeft = charges;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        for (const move of this.inner.getCandidateMoves(state).moves) {
            moves.push(move);
            if (this.rangedAttacksLeft > 0) {
                const target = state.board.getPieceAt(move.to);
                if (target && target.owner !== this.inner.owner) {
                    // Add ranged capture option
                    moves.push(new Move(move.from, move.to, this.inner, true));
                }
            }
        }
        return new CandidateMoves(moves);
    }

    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        // Convert ranged captures to destroy events
        // The EventQueue will automatically cancel the associated MoveEvent
        if (!(event instanceof CaptureEvent)) return event;
        
        // Only intercept player actions (not moves from other effects)
        if (!event.isPlayerAction) return event;

        // Check if this marksman has attacks left
        if (this.rangedAttacksLeft <= 0) return event;

        // Check if the attacker is this marksman piece
        const attackerAtPosition = ctx.state.board.getPieceAt(event.attacker.position);
        if (!attackerAtPosition || attackerAtPosition.id !== this.id) return event;

        // Convert to ranged destroy (EventQueue will cancel the associated MoveEvent)
        const targetFromState = ctx.state.board.getPieceAt(event.target.position);
        if (!targetFromState) return event; // Target already gone
        
        this.rangedAttacksLeft--;
        return new DestroyEvent(targetFromState, "Marksman ranged attack", event.actor, this.id, "marksman");
    }

    protected createAbilityClone(inner: Piece): Piece {
        return new MarksmanAbility(inner, this.id, this.rangedAttacksLeft);
    }
}

