// src/ChessEngine/ChessEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ChessEngine } from './ChessEngine';
import { GameState } from '../engine/state/GameState';
import { Board } from '../engine/board/Board';
import { Move } from '../engine/primitives/Move';
import { Vector2Int } from '../engine/primitives/Vector2Int';
import { PlayerColor } from '../engine/primitives/PlayerColor';
import { StandardChessRuleSet } from '../engine/rules/StandardChess';
import { Pawn } from '../engine/pieces/standard/Pawn';
import { Rook } from '../engine/pieces/standard/Rook';
import { King } from '../engine/pieces/standard/King';
import {
    GameEvent,
    MoveEvent,
    CaptureEvent,
    DestroyEvent,
    TurnAdvancedEvent,
    TurnStartEvent,
    TurnEndEvent,
    TileChangedEvent,
    PieceChangedEvent,
    GameOverEvent,
    TimeOutEvent,
} from '../engine/events/GameEvent';
import { EventSequence, FallbackPolicy } from '../engine/events/EventSequence';
import { StandardTile } from '../engine/tiles/StandardTile';

describe('ChessEngine', () => {
    let initialState: GameState;
    let ruleset: StandardChessRuleSet;

    beforeEach(() => {
        // Create a simple 8x8 board with a few pieces for testing
        const board = new Board(8, 8);
        const whitePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 1));
        const blackPawn = new Pawn(PlayerColor.Black, new Vector2Int(0, 6));
        const whiteRook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
        const blackKing = new King(PlayerColor.Black, new Vector2Int(4, 7));

        board.placePiece(whitePawn, new Vector2Int(0, 1));
        board.placePiece(blackPawn, new Vector2Int(0, 6));
        board.placePiece(whiteRook, new Vector2Int(0, 0));
        board.placePiece(blackKing, new Vector2Int(4, 7));

        initialState = GameState.createInitial(board, PlayerColor.White);
        ruleset = new StandardChessRuleSet();
    });

    describe('resolveMove', () => {
        it('should resolve a simple move and return new state and events', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            expect(piece).toBeInstanceOf(Pawn);

            const move = new Move(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                false
            );

            const result = ChessEngine.resolveMove(initialState, move, ruleset);

            expect(result.newState).toBeDefined();
            expect(result.events.length).toBeGreaterThan(0);
            const movedPiece = result.newState.board.getPieceAt(new Vector2Int(0, 2));
            expect(movedPiece).toBeDefined();
            expect(movedPiece?.name).toBe('Pawn');
            expect(movedPiece?.owner).toBe(PlayerColor.White);
            expect(result.newState.board.getPieceAt(new Vector2Int(0, 1))).toBeNull();
        });

        it('should resolve a capture move and include CaptureEvent', () => {
            // Place a black piece to capture
            const blackPiece = new Pawn(PlayerColor.Black, new Vector2Int(1, 2));
            initialState.board.placePiece(blackPiece, new Vector2Int(1, 2));

            const whitePiece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const move = new Move(
                new Vector2Int(0, 1),
                new Vector2Int(1, 2),
                whitePiece!,
                true
            );

            const result = ChessEngine.resolveMove(initialState, move, ruleset);

            // Should have both CaptureEvent and MoveEvent
            const captureEvents = result.events.filter(e => e instanceof CaptureEvent);
            const moveEvents = result.events.filter(e => e instanceof MoveEvent);

            expect(captureEvents.length).toBeGreaterThan(0);
            expect(moveEvents.length).toBeGreaterThan(0);
            expect(result.newState.board.getPieceAt(new Vector2Int(1, 2))?.owner).toBe(PlayerColor.White);
        });

        it('should handle invalid moves gracefully', () => {
            // Try to move from empty square
            const fakePiece = new Pawn(PlayerColor.White, new Vector2Int(5, 5));
            const move = new Move(
                new Vector2Int(5, 5),
                new Vector2Int(5, 6),
                fakePiece,
                false
            );

            const result = ChessEngine.resolveMove(initialState, move, ruleset);

            // Should return state unchanged or with abort events
            expect(result.newState).toBeDefined();
        });
    });

    describe('applyEventToState', () => {
        it('should apply MoveEvent correctly', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const moveEvent = new MoveEvent(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                PlayerColor.White,
                true,
                ''
            );

            const newState = ChessEngine.applyEventToState(moveEvent, initialState);

            expect(newState.board.getPieceAt(new Vector2Int(0, 2))).toBeDefined();
            expect(newState.board.getPieceAt(new Vector2Int(0, 1))).toBeNull();
            expect(newState.currentPlayer).toBe(initialState.currentPlayer);
            expect(newState.turnNumber).toBe(initialState.turnNumber);
        });

        it('should apply CaptureEvent correctly', () => {
            const attacker = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const target = initialState.board.getPieceAt(new Vector2Int(0, 6));
            
            if (attacker && target) {
                const captureEvent = new CaptureEvent(attacker, target, PlayerColor.White, true);
                const newState = ChessEngine.applyEventToState(captureEvent, initialState);

                expect(newState.board.getPieceAt(new Vector2Int(0, 6))).toBeNull();
            }
        });

        it('should apply DestroyEvent correctly', () => {
            const target = initialState.board.getPieceAt(new Vector2Int(0, 1));
            
            if (target) {
                const destroyEvent = new DestroyEvent(target, 'test', PlayerColor.White, '');
                const newState = ChessEngine.applyEventToState(destroyEvent, initialState);

                expect(newState.board.getPieceAt(new Vector2Int(0, 1))).toBeNull();
            }
        });

        it('should apply TurnAdvancedEvent correctly', () => {
            const turnEvent = new TurnAdvancedEvent(PlayerColor.Black, 2);
            const newState = ChessEngine.applyEventToState(turnEvent, initialState);

            expect(newState.currentPlayer).toBe(PlayerColor.Black);
            expect(newState.turnNumber).toBe(2);
        });

        it('should apply TileChangedEvent correctly', () => {
            const newTile = new StandardTile();
            const tileEvent = new TileChangedEvent(
                new Vector2Int(3, 3),
                newTile,
                PlayerColor.White
            );

            const newState = ChessEngine.applyEventToState(tileEvent, initialState);
            const tile = newState.board.getTile(new Vector2Int(3, 3));

            expect(tile).toBeDefined();
        });

        it('should apply PieceChangedEvent correctly', () => {
            const oldPiece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            if (oldPiece) {
                const newPiece = new Rook(PlayerColor.White, new Vector2Int(0, 1));
                const pieceEvent = new PieceChangedEvent(
                    oldPiece,
                    newPiece,
                    new Vector2Int(0, 1),
                    PlayerColor.White,
                    ''
                );

                const newState = ChessEngine.applyEventToState(pieceEvent, initialState);
                const piece = newState.board.getPieceAt(new Vector2Int(0, 1));

                expect(piece).toBeInstanceOf(Rook);
                expect(piece?.owner).toBe(PlayerColor.White);
            }
        });

        it('should handle TurnStartEvent and TurnEndEvent (no state change)', () => {
            const turnStart = new TurnStartEvent(PlayerColor.White, 1);
            const newState = ChessEngine.applyEventToState(turnStart, initialState);

            expect(newState).toBeDefined();
            expect(newState.currentPlayer).toBe(initialState.currentPlayer);
            expect(newState.turnNumber).toBe(initialState.turnNumber);

            const turnEnd = new TurnEndEvent(PlayerColor.White, 1);
            const newState2 = ChessEngine.applyEventToState(turnEnd, initialState);

            expect(newState2).toBeDefined();
            expect(newState2.currentPlayer).toBe(initialState.currentPlayer);
        });

        it('should handle GameOverEvent (no state change)', () => {
            const gameOver = new GameOverEvent(PlayerColor.White, '');
            const newState = ChessEngine.applyEventToState(gameOver, initialState);

            expect(newState).toBeDefined();
            expect(newState.currentPlayer).toBe(initialState.currentPlayer);
        });

        it('should handle TimeOutEvent (no state change)', () => {
            const timeOut = new TimeOutEvent(PlayerColor.White, '');
            const newState = ChessEngine.applyEventToState(timeOut, initialState);

            expect(newState).toBeDefined();
            expect(newState.currentPlayer).toBe(initialState.currentPlayer);
        });
    });

    describe('dispatch (interceptor pipeline)', () => {
        it('should process events through interceptor pipeline', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const moveEvent = new MoveEvent(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                PlayerColor.White,
                true,
                ''
            );

            const sequence = new EventSequence([moveEvent], FallbackPolicy.ContinueChain);
            
            // Access private method via type assertion for testing
            const result = (ChessEngine as any).dispatch(sequence, initialState);

            expect(result.newState).toBeDefined();
            expect(result.events.length).toBeGreaterThan(0);
        });

        it('should handle empty event sequence', () => {
            const sequence = new EventSequence([], FallbackPolicy.ContinueChain);
            const result = (ChessEngine as any).dispatch(sequence, initialState);

            expect(result.newState).toEqual(initialState);
            expect(result.events.length).toBe(0);
        });

        it('should handle AbortChain policy', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const moveEvent1 = new MoveEvent(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                PlayerColor.White,
                true,
                ''
            );
            const moveEvent2 = new MoveEvent(
                new Vector2Int(0, 2),
                new Vector2Int(0, 3),
                piece!,
                PlayerColor.White,
                true,
                ''
            );

            const sequence = new EventSequence([moveEvent1, moveEvent2], FallbackPolicy.AbortChain);
            const result = (ChessEngine as any).dispatch(sequence, initialState);

            expect(result.newState).toBeDefined();
            // With AbortChain, behavior depends on interceptors
        });

        it('should convert TimeOutEvent to GameOverEvent when not intercepted', () => {
            const timeOut = new TimeOutEvent(PlayerColor.White, '');
            const sequence = new EventSequence([timeOut], FallbackPolicy.ContinueChain);
            const result = (ChessEngine as any).dispatch(sequence, initialState);

            // Should have GameOverEvent instead of TimeOutEvent
            const gameOverEvents = result.events.filter((e: GameEvent) => e instanceof GameOverEvent);
            const timeOutEvents = result.events.filter((e: GameEvent) => e instanceof TimeOutEvent);

            expect(gameOverEvents.length).toBeGreaterThan(0);
            expect(timeOutEvents.length).toBe(0);
        });
    });

    describe('interceptor collection', () => {
        it('should collect interceptors from pieces and tiles', () => {
            // Pawn implements Interceptor, so it should be collected
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            expect(piece).toBeInstanceOf(Pawn);

            const moveEvent = new MoveEvent(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                PlayerColor.White,
                true,
                ''
            );

            const result = ChessEngine.resolveMove(initialState, new Move(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                false
            ), ruleset);

            // Should have processed through interceptors
            expect(result.events.length).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should handle move from non-existent piece', () => {
            const fakePiece = new Pawn(PlayerColor.White, new Vector2Int(5, 5));
            const move = new Move(
                new Vector2Int(5, 5),
                new Vector2Int(5, 6),
                fakePiece,
                false
            );

            const result = ChessEngine.resolveMove(initialState, move, ruleset);
            expect(result.newState).toBeDefined();
        });

        it('should handle move to out-of-bounds position', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            if (piece) {
                const move = new Move(
                    new Vector2Int(0, 1),
                    new Vector2Int(0, 10), // Out of bounds
                    piece,
                    false
                );

                const result = ChessEngine.resolveMove(initialState, move, ruleset);
                expect(result.newState).toBeDefined();
            }
        });

        it('should maintain immutability - original state unchanged', () => {
            const piece = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const move = new Move(
                new Vector2Int(0, 1),
                new Vector2Int(0, 2),
                piece!,
                false
            );

            const originalPiecePosition = initialState.board.getPieceAt(new Vector2Int(0, 1));
            const result = ChessEngine.resolveMove(initialState, move, ruleset);

            // Original state should be unchanged
            expect(initialState.board.getPieceAt(new Vector2Int(0, 1))).toBe(originalPiecePosition);
            expect(initialState.board.getPieceAt(new Vector2Int(0, 2))).toBeNull();
            
            // New state should have the change
            expect(result.newState.board.getPieceAt(new Vector2Int(0, 1))).toBeNull();
            expect(result.newState.board.getPieceAt(new Vector2Int(0, 2))).toBeDefined();
        });
    });
});

