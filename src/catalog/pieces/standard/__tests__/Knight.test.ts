import { describe, it, expect } from 'vitest';
import { Knight } from "../Knight";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { Pawn } from "../Pawn";

describe('Knight', () => {
    it('should move in L-shape', () => {
        const board = new Board(8, 8);
        const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(knight, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = knight.getCandidateMoves(state);
        // All 8 L-shaped moves from (3,3)
        const expectedMoves = [
            new Vector2Int(5, 4), new Vector2Int(5, 2),
            new Vector2Int(1, 4), new Vector2Int(1, 2),
            new Vector2Int(4, 5), new Vector2Int(4, 1),
            new Vector2Int(2, 5), new Vector2Int(2, 1),
        ];
        
        for (const expected of expectedMoves) {
            expect(moves.moves.some(m => m.to.equals(expected))).toBe(true);
        }
    });

    it('should jump over pieces', () => {
        const board = new Board(8, 8);
        const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
        const blocker = new Pawn(PlayerColor.White, new Vector2Int(3, 4));
        board.placePiece(knight, new Vector2Int(3, 3));
        board.placePiece(blocker, new Vector2Int(3, 4));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = knight.getCandidateMoves(state);
        // Should still be able to move to (4, 5) even with blocker at (3, 4)
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 5)))).toBe(true);
    });

    it('should not capture friendly', () => {
        const board = new Board(8, 8);
        const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
        const friendly = new Pawn(PlayerColor.White, new Vector2Int(5, 4));
        board.placePiece(knight, new Vector2Int(3, 3));
        board.placePiece(friendly, new Vector2Int(5, 4));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = knight.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 4)))).toBe(false);
    });

    it('should be able to capture enemy', () => {
        const board = new Board(8, 8);
        const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 4));
        board.placePiece(knight, new Vector2Int(3, 3));
        board.placePiece(enemy, new Vector2Int(5, 4));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = knight.getCandidateMoves(state);
        const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 4)) && m.isCapture);
        expect(captureMove).toBeDefined();
    });

    it('should have value 3', () => {
        const knight = new Knight(PlayerColor.White, new Vector2Int(0, 0));
        expect(knight.getValue()).toBe(3);
    });
});

