import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { Move } from "../../../chess-engine/primitives/Move";
import { GameState } from "../../../chess-engine/state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves } from "../../../chess-engine/rules/MovementPatterns";
import { Listener, ListenerContext } from "../../../chess-engine/listeners";
import { GameEvent, MoveEvent, PieceChangedEvent } from "../../../chess-engine/events/EventRegistry";
import { Queen } from "./Queen";

/**
 * Standard chess pawn piece.
 * Handles single/double forward moves and diagonal captures.
 * Auto-promotes to Queen when reaching the last rank (via Listener).
 */
export class Pawn extends PieceBase implements Listener {
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

    // Listener implementation for auto-promotion
    readonly priority = 0;

    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Auto-promote when pawn reaches last rank
        if (event instanceof MoveEvent) {
            // Check if this pawn is the mover
            const movedPiece = ctx.state.board.getPieceAt(event.to);
            if (!movedPiece || movedPiece.id !== this.id) {
                return [];
            }

            const lastRank = this.owner === PlayerColor.White ? ctx.state.board.height - 1 : 0;
            if (event.to.y === lastRank) {
                // Promote to Queen
                const newQueen = new Queen(this.owner, event.to);
                return [
                    new PieceChangedEvent(
                        this,
                        newQueen,
                        event.to,
                        event.actor,
                        this.id,
                        event.isPlayerAction
                    )
                ];
            }
        }
        return [];
    }
}


