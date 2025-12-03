import { describe, it, expect } from 'vitest';
import { GuardianTile } from "../GuardianTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { TileChangedEvent } from "../../../chess-engine/events/EventRegistry";
import { StandardTile } from "../StandardTile";

describe('GuardianTile', () => {
    it('should cancel capture and consume itself', () => {
        const board = new Board(8, 8);
        const protectedPiece = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const attacker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
        const guardian = new GuardianTile(new Vector2Int(3, 3));
        board.placePiece(protectedPiece, new Vector2Int(3, 3));
        board.placePiece(attacker, new Vector2Int(4, 4));
        board.setTile(new Vector2Int(3, 3), guardian);
        const state = new GameState(board, PlayerColor.Black, 1);

        const captureMove = new Move(new Vector2Int(4, 4), new Vector2Int(3, 3), attacker, true);
        const result = ChessEngine.resolveMove(state, captureMove, [guardian]);

        // Protected piece should survive, guardian should be consumed
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner).toBe(PlayerColor.White);
        const tile = result.finalState.board.getTile(new Vector2Int(3, 3));
        expect(tile).toBeInstanceOf(StandardTile);
        
        const tileChangeEvent = result.eventLog.find(e => e instanceof TileChangedEvent);
        expect(tileChangeEvent).toBeDefined();
    });

    it('should cancel move to occupied square', () => {
        const board = new Board(8, 8);
        const occupant = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const mover = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
        const guardian = new GuardianTile(new Vector2Int(3, 3));
        board.placePiece(occupant, new Vector2Int(3, 3));
        board.placePiece(mover, new Vector2Int(2, 2));
        board.setTile(new Vector2Int(3, 3), guardian);
        const state = new GameState(board, PlayerColor.Black, 1);

        const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), mover);
        const result = ChessEngine.resolveMove(state, move, [guardian]);

        // Move should be cancelled, guardian consumed
        expect(result.finalState.board.getPieceAt(new Vector2Int(2, 2))?.id).toBe(mover.id);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner).toBe(PlayerColor.White);
        const tile = result.finalState.board.getTile(new Vector2Int(3, 3));
        expect(tile).toBeInstanceOf(StandardTile);
    });
});

