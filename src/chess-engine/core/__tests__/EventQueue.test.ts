import { describe, it, expect, beforeEach } from 'vitest';
import { EventQueue } from "../EventQueue";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Listener } from "../../listeners";
import { MoveEvent, DestroyEvent, CaptureEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";

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

describe('EventQueue', () => {
    let board: Board;
    let piece1: Piece;
    let initialState: GameState;
    let moveEvent: MoveEvent;

    beforeEach(() => {
        board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
        board.placePiece(piece1, new Vector2Int(1, 1));
        initialState = new GameState(board, PlayerColor.White, 1, []);
        moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(3, 3),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
    });

    it('should process basic event without listeners', () => {
        const result = EventQueue.process(initialState, [moveEvent], []);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result.eventLog.length).toBe(1);
    });

    it('should allow onBeforeEvent to modify event', () => {
        const modifyingListener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Modify the destination
                    return new MoveEvent(
                        event.from,
                        new Vector2Int(5, 5), // Changed destination
                        event.piece,
                        event.actor,
                        event.isPlayerAction,
                        event.sourceId
                    );
                }
                return event;
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [modifyingListener]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(5, 5))).not.toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).toBeNull();
    });

    it('should allow onBeforeEvent to cancel event', () => {
        const cancelingListener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                return null; // Cancel all events
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [cancelingListener]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(1, 1))).not.toBeNull();
        expect(result.eventLog.length).toBe(0);
    });

    it('should allow onAfterEvent to generate new events', () => {
        const generatingListener: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Get the piece from the updated state at its new position
                    const movedPiece = ctx.state.board.getPieceAt(event.to);
                    if (movedPiece) {
                        const destroyEvent = new DestroyEvent(
                            movedPiece,
                            "Destroyed by listener",
                            event.actor,
                            "listener"
                        );
                        return [destroyEvent];
                    }
                }
                return [];
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [generatingListener]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).toBeNull();
        expect(result.eventLog.length).toBe(2);
    });

    it('should call listeners in priority order (lower first)', () => {
        const orderLog: number[] = [];
        const listener1: Listener = {
            priority: 10, // Higher priority = later
            onBeforeEvent(ctx, event) {
                orderLog.push(10);
                return event;
            },
        };
        const listener2: Listener = {
            priority: 0, // Lower priority = earlier
            onBeforeEvent(ctx, event) {
                orderLog.push(0);
                return event;
            },
        };
        const listener3: Listener = {
            priority: 5, // Middle
            onBeforeEvent(ctx, event) {
                orderLog.push(5);
                return event;
            },
        };

        EventQueue.process(initialState, [moveEvent], [listener1, listener2, listener3]);
        expect(orderLog).toEqual([0, 5, 10]);
    });

    it('should handle chain reactions', () => {
        // Set up board with multiple pieces for chain reaction
        const boardWithChain = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        const piece2 = createMockPiece("piece2", PlayerColor.White, new Vector2Int(2, 2));
        const piece3 = createMockPiece("piece3", PlayerColor.White, new Vector2Int(3, 3));
        boardWithChain.placePiece(piece1, new Vector2Int(1, 1));
        boardWithChain.placePiece(piece2, new Vector2Int(2, 2));
        boardWithChain.placePiece(piece3, new Vector2Int(3, 3));
        const stateWithChain = new GameState(boardWithChain, PlayerColor.White, 1, []);

        let chainCount = 0;
        const chainListener: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                chainCount++;
                if (chainCount < 3 && event instanceof DestroyEvent) {
                    // Generate another destroy event for the next piece in the chain
                    let nextPiece: Piece | null = null;
                    if (chainCount === 1) {
                        nextPiece = ctx.state.board.getPieceAt(new Vector2Int(2, 2));
                    } else if (chainCount === 2) {
                        nextPiece = ctx.state.board.getPieceAt(new Vector2Int(3, 3));
                    }
                    if (nextPiece) {
                        return [new DestroyEvent(nextPiece, "Chain reaction", PlayerColor.White, "chain")];
                    }
                }
                return [];
            },
        };

        const destroyEvent = new DestroyEvent(piece1, "Initial", PlayerColor.White, "source");
        const result = EventQueue.process(stateWithChain, [destroyEvent], [chainListener]);
        expect(result.eventLog.length).toBeGreaterThanOrEqual(3);
    });

    it('should not call onAfterEvent if event is cancelled', () => {
        let afterCalled = false;
        const cancelAndCheckListener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                return null; // Cancel
            },
            onAfterEvent(ctx, event) {
                afterCalled = true; // Should not be called
                return [];
            },
        };

        EventQueue.process(initialState, [moveEvent], [cancelAndCheckListener]);
        expect(afterCalled).toBe(false);
    });

    it('should allow onBeforeEvent to return array for multi-event replacement', () => {
        const board = new Board(8, 8);
        const piece1 = createMockPiece("p1", PlayerColor.White, new Vector2Int(0, 0));
        const piece2 = createMockPiece("p2", PlayerColor.Black, new Vector2Int(1, 1));
        const piece3 = createMockPiece("p3", PlayerColor.Black, new Vector2Int(2, 2));
        board.placePiece(piece1, new Vector2Int(0, 0));
        board.placePiece(piece2, new Vector2Int(1, 1));
        board.placePiece(piece3, new Vector2Int(2, 2));
        const state = new GameState(board, PlayerColor.White, 1);

        const captureEvent = new CaptureEvent(piece1, piece2, PlayerColor.White, true);

        const listener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof CaptureEvent) {
                    // Replace capture with destroy + move sequence
                    return [
                        new DestroyEvent(event.target, "Replaced", event.actor, "listener"),
                        new MoveEvent(event.attacker.position, new Vector2Int(3, 3), event.attacker, event.actor, false, "listener"),
                    ];
                }
                return event;
            },
        };

        const result = EventQueue.process(state, [captureEvent], [listener]);

        // Original capture should be cancelled, replaced events should be applied
        expect(result.eventLog.length).toBe(2);
        expect(result.eventLog[0]).toBeInstanceOf(DestroyEvent);
        expect(result.eventLog[1]).toBeInstanceOf(MoveEvent);
        
        // Piece2 should be destroyed, piece1 should be moved
        expect(result.finalState.board.getPieceAt(new Vector2Int(1, 1))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.id).toBe("p1");
        expect(result.finalState.board.getPieceAt(new Vector2Int(0, 0))).toBeNull();
    });

    it('should handle multiple listeners interacting', () => {
        const modifyListener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    return new MoveEvent(
                        event.from,
                        new Vector2Int(7, 7),
                        event.piece,
                        event.actor,
                        event.isPlayerAction,
                        event.sourceId
                    );
                }
                return event;
            },
        };

        const generateListener: Listener = {
            priority: 1,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Get the piece from the updated state at its new position
                    const movedPiece = ctx.state.board.getPieceAt(event.to);
                    if (movedPiece) {
                        return [new DestroyEvent(movedPiece, "After move", event.actor, "gen")];
                    }
                }
                return [];
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [modifyListener, generateListener]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(7, 7))).toBeNull();
        expect(result.eventLog.length).toBe(2);
    });
});
