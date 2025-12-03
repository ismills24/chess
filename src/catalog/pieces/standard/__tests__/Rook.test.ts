import { describe, it, expect } from 'vitest';
import { Rook } from "../Rook";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { Pawn } from "../Pawn";

describe('Rook', () => {
    it('should move horizontally', () => {
        const board = new Board(8, 8);
        const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(rook, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = rook.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(0, 3)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(7, 3)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(3, 3)))).toBe(false);
    });

    it('should move vertically', () => {
        const board = new Board(8, 8);
        const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(rook, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = rook.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(3, 0)))).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(3, 7)))).toBe(true);
    });

    it('should not move diagonally', () => {
        const board = new Board(8, 8);
        const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
        board.placePiece(rook, new Vector2Int(3, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = rook.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 4)))).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(2, 2)))).toBe(false);
    });

    it('should be blocked by friendly piece', () => {
        const board = new Board(8, 8);
        const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
        const blocker = new Pawn(PlayerColor.White, new Vector2Int(5, 3));
        board.placePiece(rook, new Vector2Int(3, 3));
        board.placePiece(blocker, new Vector2Int(5, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = rook.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(5, 3)))).toBe(false);
        expect(moves.moves.some(m => m.to.x > 5 && m.to.y === 3)).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 3)))).toBe(true);
    });

    it('should be able to capture enemy piece', () => {
        const board = new Board(8, 8);
        const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 3));
        board.placePiece(rook, new Vector2Int(3, 3));
        board.placePiece(enemy, new Vector2Int(5, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = rook.getCandidateMoves(state);
        const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 3)) && m.isCapture);
        expect(captureMove).toBeDefined();
        expect(moves.moves.some(m => m.to.x > 5 && m.to.y === 3)).toBe(false);
    });

    it('should have value 5', () => {
        const rook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
        expect(rook.getValue()).toBe(5);
    });
});

