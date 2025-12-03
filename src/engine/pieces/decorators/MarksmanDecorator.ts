import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { Move } from "../../primitives/Move";
import { Vector2Int } from "../../primitives/Vector2Int";
import { GameState } from "../../state/GameState";
import { CaptureEvent, DestroyEvent, GameEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { Interceptor } from "../../events/Interceptor";
import { CandidateMoves } from "../MovementHelper";

/**
 * Allows the piece to capture enemies at a distance without moving.
 * Consumes charges for ranged attacks.
 */
export class MarksmanDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    private rangedAttacksLeft: number = 1;
    readonly priority = 0;
    protected readonly decoratorValue = 2;

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

    intercept(ev: CaptureEvent, state: GameState): EventSequence {
        console.log(`[Marksman] Intercepting capture, inner id is ${this.inner.id} and attacker id is ${ev.attacker?.id}`);
        
        // Only intercept player actions (not moves from other effects)
        if (!ev.isPlayerAction) {
            return EventSequences.Continue as EventSequence;
        }
        
        // Check if this marksman has attacks left
        if (this.rangedAttacksLeft <= 0) {
            return EventSequences.Continue as EventSequence;
        }
        
        // Check if the attacker is this marksman piece (by position and owner)
        const attackerAtPosition = state.board.getPieceAt(ev.attacker?.position || new Vector2Int(-1, -1));
        if (!attackerAtPosition || attackerAtPosition.id !== this.id) {
            return EventSequences.Continue as EventSequence;
        }
        
        console.log(`[Marksman] Ranged shot fired by ${this.inner.name}`);
        this.rangedAttacksLeft--;

        const destroy = new DestroyEvent(ev.target, "Marksman ranged attack", ev.actor, this.id);
        return new EventSequence([destroy], FallbackPolicy.AbortChain);
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new MarksmanDecorator(inner, this.id, this.rangedAttacksLeft);
    }
}
