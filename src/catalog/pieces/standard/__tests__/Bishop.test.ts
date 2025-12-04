import { describe, it, expect } from 'vitest';
import { Bishop } from "../Bishop";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { Pawn } from "../Pawn";

describe('Bishop', () => {
    it('should move diagonally', () => {
        const board = new Board(8, 8);
        const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(bishop, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = bishop.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(0, 0)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(7, 7)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(0, 6)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(6, 0)))).toBe(true);
    });

    it('should not move horizontally or vertically', () => {
        const board = new Board(8, 8);
        const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(bishop, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = bishop.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 3)))).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(3, 5)))).toBe(false);
    });

    it('should be blocked by friendly piece', () => {
        const board = new Board(8, 8);
        const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
        const blocker = new Pawn(PlayerColor.White, new Vector2Int(5, 5));
        board.placePiece(bishop, new Vector2Int(3, 3));
        board.placePiece(blocker, new Vector2Int(5, 5));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = bishop.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 5)))).toBe(false);
        expect(moves.moves.some(m => m.to.x > 5 && m.to.y > 5)).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 4)))).toBe(true);
    });

    it('should be able to capture enemy piece', () => {
        const board = new Board(8, 8);
        const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
        board.placePiece(bishop, new Vector2Int(3, 3));
        board.placePiece(enemy, new Vector2Int(5, 5));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = bishop.getCandidateMoves(state);
        const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 5)) && m.isCapture);
        expect(captureMove).toBeDefined();
        expect(moves.moves.some(m => m.to.x > 5 && m.to.y > 5)).toBe(false);
    });

    it('should have value 3', () => {
        const bishop = new Bishop(PlayerColor.White, new Vector2Int(0, 0));
        expect(bishop.getValue()).toBe(3);
    });
});

