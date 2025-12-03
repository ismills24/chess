import { describe, it, expect } from 'vitest';
import { MarksmanAbility } from "../MarksmanAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { DestroyEvent } from "../../../chess-engine/events/EventRegistry";
import { Listener } from "../../../chess-engine/listeners";

describe('MarksmanAbility', () => {
    it('should convert capture to ranged destroy', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const marksman = new MarksmanAbility(basePawn);
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
        board.placePiece(marksman, new Vector2Int(0, 0));
        board.placePiece(enemy, new Vector2Int(5, 5));
        const state = new GameState(board, PlayerColor.White, 1);

        const captureMove = new Move(new Vector2Int(0, 0), new Vector2Int(5, 5), marksman, true);
        const result = ChessEngine.resolveMove(state, captureMove, [marksman]);

        // Should have destroy event instead of capture
        const destroyEvent = result.eventLog.find(e => e instanceof DestroyEvent);
        expect(destroyEvent).toBeDefined();
        expect(result.finalState.board.getPieceAt(new Vector2Int(5, 5))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(0, 0))?.id).toBe(marksman.id);
    });

    it('should consume charges', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const marksman = new MarksmanAbility(basePawn, undefined, 2); // 2 charges
        const enemy1 = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
        const enemy2 = new Pawn(PlayerColor.Black, new Vector2Int(6, 6));
        board.placePiece(marksman, new Vector2Int(0, 0));
        board.placePiece(enemy1, new Vector2Int(5, 5));
        board.placePiece(enemy2, new Vector2Int(6, 6));
        const state = new GameState(board, PlayerColor.White, 1);

        // First ranged attack
        const move1 = new Move(new Vector2Int(0, 0), new Vector2Int(5, 5), marksman, true);
        const result1 = ChessEngine.resolveMove(state, move1, [marksman]);
        expect(result1.eventLog.some(e => e instanceof DestroyEvent)).toBe(true);

        // Second ranged attack (should still work with 1 charge left)
        const state2 = result1.finalState;
        const marksman2 = state2.board.getPieceAt(new Vector2Int(0, 0))!;
        // Get listeners from the new state (the marksman piece itself is a listener)
        const listeners2: Listener[] = [];
        for (const piece of state2.board.getAllPieces()) {
            if ('priority' in piece && typeof (piece as any).onBeforeEvent === 'function') {
                listeners2.push(piece as Listener);
            }
        }
        const move2 = new Move(new Vector2Int(0, 0), new Vector2Int(6, 6), marksman2, true);
        const result2 = ChessEngine.resolveMove(state2, move2, listeners2);
        expect(result2.eventLog.some(e => e instanceof DestroyEvent)).toBe(true);
    });

    it('should add ranged capture to candidate moves', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const marksman = new MarksmanAbility(basePawn);
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(1, 1));
        board.placePiece(marksman, new Vector2Int(0, 0));
        board.placePiece(enemy, new Vector2Int(1, 1));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = marksman.getCandidateMoves(state);
        // Should have both regular move and ranged capture option
        expect(moves.moves.length).toBeGreaterThanOrEqual(2);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 1)) && m.isCapture)).toBe(true);
    });
});

