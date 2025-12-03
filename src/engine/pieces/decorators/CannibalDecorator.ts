import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Piece } from "../Piece";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { CaptureEvent } from "../../events/GameEvent";
import { EventSequence } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";
import { Interceptor } from "../../events/Interceptor";
import { CandidateMoves } from "../MovementHelper";

/**
 * A canniballistic piece can only capture friendly pieces.
 */
export class CannibalDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    readonly priority = 0;
    protected readonly decoratorValue = 1;

    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        const originalMoves = this.inner.getCandidateMoves(state);
        for (const move of originalMoves.moves) {
            const isEnemy = originalMoves.movesOnEnemyPieces.some(m => m.to.equals(move.to));
            if (!isEnemy) {
                moves.push(move);
            }
        }
        moves.push(...originalMoves.movesOnFriendlyPieces);
        return new CandidateMoves(moves);
    }

    intercept(ev: CaptureEvent, state: GameState): EventSequence {
        return EventSequences.Continue;
    }

    protected createDecoratorClone(inner: Piece): Piece {
        return new CannibalDecorator(inner, this.id);
    }
}
