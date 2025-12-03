import { describe, it, expect } from 'vitest';
import { King } from "../King";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { Pawn } from "../Pawn";

describe('King', () => {
    it('should move one square in all directions', () => {
        const board = new Board(8, 8);
        const king = new King(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(king, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = king.getCandidateMoves(state);
        // All 8 adjacent squares
        const expectedMoves = [
            new Vector2Int(2, 2), new Vector2Int(3, 2), new Vector2Int(4, 2),
            new Vector2Int(2, 3), new Vector2Int(4, 3),
            new Vector2Int(2, 4), new Vector2Int(3, 4), new Vector2Int(4, 4),
        ];
        
        for (const expected of expectedMoves) {
            expect(moves.moves.some(m => m.to.equals(expected))).toBe(true);
        }
    });

    it('should not move more than one square', () => {
        const board = new Board(8, 8);
        const king = new King(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(king, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = king.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 3)))).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(3, 5)))).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 5)))).toBe(false);
    });

    it('should not capture friendly', () => {
        const board = new Board(8, 8);
        const king = new King(PlayerColor.White, new Vector2Int(3, 3));
        const friendly = new Pawn(PlayerColor.White, new Vector2Int(4, 3));
        board.placePiece(king, new Vector2Int(3, 3));
        board.placePiece(friendly, new Vector2Int(4, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = king.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 3)))).toBe(false);
    });

    it('should be able to capture enemy', () => {
        const board = new Board(8, 8);
        const king = new King(PlayerColor.White, new Vector2Int(3, 3));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(4, 3));
        board.placePiece(king, new Vector2Int(3, 3));
        board.placePiece(enemy, new Vector2Int(4, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = king.getCandidateMoves(state);
        const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(4, 3)) && m.isCapture);
        expect(captureMove).toBeDefined();
    });

    it('should have very high value', () => {
        const king = new King(PlayerColor.White, new Vector2Int(0, 0));
        expect(king.getValue()).toBe(100000);
    });
});

