import { describe, it, expect } from 'vitest';
import { Pawn } from "../Pawn";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { ChessEngine } from "../../../../chess-engine/core/ChessEngine";
import { Move } from "../../../../chess-engine/primitives/Move";
import { Queen } from "../Queen";
import { PieceChangedEvent } from "../../../../chess-engine/events/EventRegistry";

describe('Pawn', () => {
    it('should move forward', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
        board.placePiece(pawn, new Vector2Int(1, 1));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = pawn.getCandidateMoves(state);
        expect(moves.moves.length).toBeGreaterThanOrEqual(1);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 2)))).toBe(true);
    });

    it('should be able to move forward 2 from start rank', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
        board.placePiece(pawn, new Vector2Int(1, 1));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = pawn.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 3)))).toBe(true);
    });

    it('should be able to capture diagonally', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
        board.placePiece(pawn, new Vector2Int(1, 1));
        board.placePiece(enemy, new Vector2Int(2, 2));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = pawn.getCandidateMoves(state);
        const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(2, 2)) && m.isCapture);
        expect(captureMove).toBeDefined();
    });

    it('should auto-promote on last rank', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 6));
        board.placePiece(pawn, new Vector2Int(0, 6));
        const state = new GameState(board, PlayerColor.White, 1);

        const move = new Move(new Vector2Int(0, 6), new Vector2Int(0, 7), pawn);
        const result = ChessEngine.resolveMove(state, move, [pawn]);

        // Check that pawn was promoted to queen
        const pieceAtEnd = result.finalState.board.getPieceAt(new Vector2Int(0, 7));
        expect(pieceAtEnd).toBeInstanceOf(Queen);
        expect(pieceAtEnd?.owner).toBe(PlayerColor.White);
        
        // Check that promotion event was generated
        const promotionEvent = result.eventLog.find(e => e instanceof PieceChangedEvent);
        expect(promotionEvent).toBeDefined();
    });

    it('should move in opposite direction for black', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.Black, new Vector2Int(1, 6));
        board.placePiece(pawn, new Vector2Int(1, 6));
        const state = new GameState(board, PlayerColor.Black, 1);

        const moves = pawn.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 5)))).toBe(true);
    });

    it('should not move forward if blocked', () => {
        const board = new Board(8, 8);
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
        const blocker = new Pawn(PlayerColor.White, new Vector2Int(1, 2));
        board.placePiece(pawn, new Vector2Int(1, 1));
        board.placePiece(blocker, new Vector2Int(1, 2));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = pawn.getCandidateMoves(state);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 2)))).toBe(false);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(1, 3)))).toBe(false);
    });
});

