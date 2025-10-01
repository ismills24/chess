import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { PieceBase } from "../PieceBase";
import { MoveEvent, PieceChangedEvent } from "../../events/GameEvent";
import { EventSequences } from "../../events/EventSequences";
import { Interceptor } from "../../events/Interceptor";
import { EventSequenceLike } from "../../events/EventSequence";
import { Queen } from "./Queen";
import { CandidateMoves } from "../MovementHelper";

/**
 * Standard chess pawn piece.
 * Handles single/double forward moves and diagonal captures.
 */
export class Pawn extends PieceBase implements Interceptor<MoveEvent> {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Pawn", owner, position);
    }

    getValue(): number {
        return 1;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        const direction = this.owner === PlayerColor.White ? 1 : -1;
        const startRank = this.owner === PlayerColor.White ? 1 : state.board.height - 2;

        // Forward 1
        const forwardOne = this.position.add(new Vector2Int(0, direction));
        if (state.board.isInBounds(forwardOne) && !state.board.getPieceAt(forwardOne)) {
            moves.push(new Move(this.position, forwardOne, this));
        }

        // Forward 2 (from start rank)
        if (this.position.y === startRank) {
            const forwardTwo = this.position.add(new Vector2Int(0, direction * 2));
            if (
                state.board.isInBounds(forwardTwo) &&
                !state.board.getPieceAt(forwardTwo) &&
                !state.board.getPieceAt(forwardOne)
            ) {
                moves.push(new Move(this.position, forwardTwo, this));
            }
        }

        // Diagonal captures
        for (const offset of [-1, 1]) {
            const diag = this.position.add(new Vector2Int(offset, direction));
            if (state.board.isInBounds(diag)) {
                const target = state.board.getPieceAt(diag);
                if (target && target.owner !== this.owner) {
                    moves.push(new Move(this.position, diag, this, true));
                }
            }
        }

        return new CandidateMoves(moves);
    }

    readonly priority = 0;

    intercept(ev: MoveEvent, state: GameState): EventSequenceLike {
        // Only intercept if this pawn is the mover and it reached the last rank
        if (!ev.piece || ev.piece.id !== this.id) return EventSequences.Continue;

        const lastRank = this.owner === PlayerColor.White ? state.board.height - 1 : 0;
        if (ev.to.y !== lastRank) return EventSequences.Continue;

        return EventSequences.Single(
            new PieceChangedEvent(
                this,
                new Queen(this.owner, ev.to),
                ev.to,
                ev.actor,
                ev.sourceId,
                ev.isPlayerAction
            )
        );
    }
}
