import { describe, it, expect } from 'vitest';
import { ExplodingAbility } from "../ExplodingAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { DestroyEvent } from "../../../chess-engine/events/EventRegistry";

describe('ExplodingAbility', () => {
    it('should destroy adjacent pieces when captured', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const exploding = new ExplodingAbility(basePawn);
        const enemy1 = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
        const enemy2 = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
        const friendly = new Pawn(PlayerColor.White, new Vector2Int(3, 4));
        board.placePiece(exploding, new Vector2Int(3, 3));
        board.placePiece(enemy1, new Vector2Int(2, 2));
        board.placePiece(enemy2, new Vector2Int(4, 4));
        board.placePiece(friendly, new Vector2Int(3, 4));
        const state = new GameState(board, PlayerColor.Black, 1);

        // Create a piece at (4,3) to capture from
        const capturer = new Pawn(PlayerColor.Black, new Vector2Int(4, 3));
        board.placePiece(capturer, new Vector2Int(4, 3));
        const state2 = new GameState(board, PlayerColor.Black, 1);
        
        const captureMove = new Move(new Vector2Int(4, 3), new Vector2Int(3, 3), capturer, true);
        const result = ChessEngine.resolveMove(state2, captureMove);

        // Exploding piece and adjacent pieces should be destroyed
        expect(result.finalState.board.getPieceAt(new Vector2Int(2, 2))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(4, 4))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 4))).toBeNull();
        
        const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
        expect(destroyEvents.length).toBeGreaterThanOrEqual(3);
    });

    it('should destroy adjacent pieces when destroyed', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const exploding = new ExplodingAbility(basePawn);
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
        board.placePiece(exploding, new Vector2Int(3, 3));
        board.placePiece(enemy, new Vector2Int(2, 2));
        const state = new GameState(board, PlayerColor.Black, 1);

        // Use a different sourceId (not exploding.id) so the ability recognizes it as external
        const destroyEvent = new DestroyEvent(exploding, "Test destroy", PlayerColor.Black, "test-source");
        const destroyResult = ChessEngine.resolveEvent(state, destroyEvent);

        expect(destroyResult.finalState.board.getPieceAt(new Vector2Int(3, 3))).toBeNull();
        expect(destroyResult.finalState.board.getPieceAt(new Vector2Int(2, 2))).toBeNull();
    });
});

