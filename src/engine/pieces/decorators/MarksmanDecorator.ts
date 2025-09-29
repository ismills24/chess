import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { CaptureEvent, DestroyEvent, GameEvent } from "../../events/GameEvent";
import { EventSequence } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { Interceptor } from "../../events/Interceptor";

/**
 * Allows the piece to capture enemies at a distance without moving.
 * Consumes charges for ranged attacks.
 */
export class MarksmanDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    private rangedAttacksLeft: number = 1;
    readonly priority = 0;

    constructor(inner: Piece, id?: string, charges = 1) {
        super(inner, id);
        this.rangedAttacksLeft = charges;
    }

    getPseudoLegalMoves(state: GameState): Move[] {
        const moves: Move[] = [];
        for (const move of this.inner.getPseudoLegalMoves(state)) {
            moves.push(move);
            if (this.rangedAttacksLeft > 0) {
                const target = state.board.getPieceAt(move.to);
                if (target && target.owner !== this.inner.owner) {
                    // Add ranged capture option
                    moves.push(new Move(move.from, move.to, this.inner, true));
                }
            }
        }
        return moves;
    }

    intercept(ev: CaptureEvent, _state: GameState): EventSequence {
        console.log(`[Marksman] Intercepting capture, inner id is ${this.inner.id} and attacker id is ${ev.attacker?.id}`);
        if (this.rangedAttacksLeft > 0 && ev.attacker?.id === this.inner.id) {
            console.log(`[Marksman] Ranged shot fired by ${this.inner.name}`);
            this.rangedAttacksLeft--;

            const destroy = new DestroyEvent(ev.target, "Marksman ranged attack", ev.actor, this.id);
            return new EventSequence([destroy], "AbortChain" as any);
        }

        return EventSequences.Continue as EventSequence;
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new MarksmanDecorator(inner, this.id, this.rangedAttacksLeft);
    }
}
