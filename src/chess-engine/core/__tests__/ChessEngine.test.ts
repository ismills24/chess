import { describe, it, expect, beforeEach } from 'vitest';
import { ChessEngine } from "../ChessEngine";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { Listener } from "../../listeners";
import { TurnStartEvent, MoveEvent, DestroyEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";
import { RuleSet } from "../../rules/RuleSet";

// Mock factories
function createMockPiece(id: string, owner: PlayerColor, pos: Vector2Int): Piece {
    return {
        id,
        name: "MockPiece",
        owner,
        position: pos,
        movesMade: 0,
        capturesMade: 0,
        clone() {
            return createMockPiece(this.id, this.owner, this.position);
        },
    };
}

function createMockTile(id: string, pos: Vector2Int): Tile {
    return {
        id,
        position: pos,
        clone() {
            return createMockTile(this.id, this.position);
        },
    };
}

// Mock RuleSet for testing
class MockRuleSet implements RuleSet {
    getLegalMoves(state: GameState, piece: Piece): Move[] {
        // Return a simple move for testing
        return [new Move(piece.position, new Vector2Int(piece.position.x + 1, piece.position.y), piece)];
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        return { over: false, winner: null };
    }
}

describe('ChessEngine', () => {
    let board: Board;
    let piece1: Piece;
    let initialState: GameState;

    beforeEach(() => {
        board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
        board.placePiece(piece1, new Vector2Int(1, 1));
        initialState = new GameState(board, PlayerColor.White, 1, []);
    });

    it('should resolve basic move', () => {
        const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1);
        const result = ChessEngine.resolveMove(initialState, move);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result.eventLog.length).toBeGreaterThanOrEqual(1);
    });

    it('should resolve move with capture', () => {
        const piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(3, 3));
        const boardWithEnemy = board.clone();
        boardWithEnemy.placePiece(piece2, new Vector2Int(3, 3));
        const stateWithEnemy = new GameState(boardWithEnemy, PlayerColor.White, 1, []);

        const captureMove = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1, true);
        const result = ChessEngine.resolveMove(stateWithEnemy, captureMove);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(1, 1))).toBeNull();
        // Check that capture event is in log
        const hasCaptureEvent = result.eventLog.some(e => e.constructor.name === "CaptureEvent");
        expect(hasCaptureEvent).toBe(true);
    });

    it('should resolve single event', () => {
        const turnStartEvent = new TurnStartEvent(PlayerColor.White, 1);
        const result = ChessEngine.resolveEvent(initialState, turnStartEvent);
        expect(result.eventLog.length).toBe(1);
        expect(result.eventLog[0]).toBeInstanceOf(TurnStartEvent);
    });

    it('should resolve move without turn management', () => {
        const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1);
        const result = ChessEngine.resolveMove(initialState, move);
        const eventTypes = result.eventLog.map(e => e.constructor.name);
        expect(eventTypes).toContain("MoveEvent");
        // Note: TurnStart/TurnEnd/TurnAdvanced are now ChessManager's responsibility
    });

    it('should call listeners in resolveMove', () => {
        let listenerCalled = false;
        const testListenerPiece: Piece & Listener = {
            ...piece1,
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    listenerCalled = true;
                }
                return [];
            },
        };

        const boardWithListener = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        boardWithListener.placePiece(testListenerPiece, new Vector2Int(1, 1));
        const stateWithListener = new GameState(boardWithListener, PlayerColor.White, 1, []);

        const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), testListenerPiece);
        ChessEngine.resolveMove(stateWithListener, move);
        expect(listenerCalled).toBe(true);
    });

    it('should get legal moves', () => {
        const ruleset = new MockRuleSet();
        const legalMoves = ChessEngine.getLegalMoves(initialState, piece1, ruleset);
        expect(legalMoves.length).toBeGreaterThan(0);
        expect(legalMoves[0]).toBeInstanceOf(Move);
    });

    it('should check if game is over', () => {
        const ruleset = new MockRuleSet();
        const gameOverResult = ChessEngine.isGameOver(initialState, ruleset);
        expect(typeof gameOverResult.over).toBe("boolean");
        expect(gameOverResult.winner === null || gameOverResult.winner === PlayerColor.White || gameOverResult.winner === PlayerColor.Black).toBe(true);
    });

    it('should maintain state immutability across multiple resolves', () => {
        const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1);
        const result1 = ChessEngine.resolveMove(initialState, move);
        const result2 = ChessEngine.resolveMove(initialState, move);
        expect(initialState.board.getPieceAt(new Vector2Int(1, 1))).not.toBeNull();
        expect(result1.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result2.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
    });

    it('should handle chain reactions', () => {
        const chainListenerPiece: Piece & Listener = {
            ...piece1,
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Generate destroy event
                    return [new DestroyEvent(event.piece, "Chain", event.actor, "chain")];
                }
                return [];
            },
        };

        const boardWithListener = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        boardWithListener.placePiece(chainListenerPiece, new Vector2Int(1, 1));
        const stateWithListener = new GameState(boardWithListener, PlayerColor.White, 1, []);

        const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), chainListenerPiece);
        const result = ChessEngine.resolveMove(stateWithListener, move);
        expect(result.eventLog.length).toBeGreaterThanOrEqual(2);
        const hasDestroy = result.eventLog.some(e => e instanceof DestroyEvent);
        expect(hasDestroy).toBe(true);
    });
});
