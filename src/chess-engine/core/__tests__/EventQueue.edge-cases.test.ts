import { describe, it, expect, beforeEach } from 'vitest';
import { EventQueue } from "../EventQueue";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Listener } from "../../listeners";
import { GameEvent, MoveEvent, DestroyEvent, CaptureEvent } from "../../events/EventRegistry";
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

describe('EventQueue Edge Cases', () => {
    let board: Board;
    let piece1: Piece;
    let piece2: Piece;
    let initialState: GameState;
    let moveEvent: MoveEvent;

    beforeEach(() => {
        board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
        piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(2, 2));
        board.placePiece(piece1, new Vector2Int(1, 1));
        board.placePiece(piece2, new Vector2Int(2, 2));
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

    it('should handle empty event queue', () => {
        const result = EventQueue.process(initialState, [], []);
        expect(result.finalState).toBe(initialState);
        expect(result.eventLog.length).toBe(0);
    });

    it('should handle empty listener array', () => {
        const result = EventQueue.process(initialState, [moveEvent], []);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result.eventLog.length).toBe(1);
    });

    it('should handle listeners with same priority', () => {
        const samePriorityLog: string[] = [];
        const listenerA: Listener = {
            priority: 5,
            onBeforeEvent(ctx, event) {
                samePriorityLog.push("A");
                return event;
            },
        };
        const listenerB: Listener = {
            priority: 5,
            onBeforeEvent(ctx, event) {
                samePriorityLog.push("B");
                return event;
            },
        };
        const listenerC: Listener = {
            priority: 5,
            onBeforeEvent(ctx, event) {
                samePriorityLog.push("C");
                return event;
            },
        };

        EventQueue.process(initialState, [moveEvent], [listenerA, listenerB, listenerC]);
        expect(samePriorityLog.length).toBe(3);
        expect(samePriorityLog).toContain("A");
        expect(samePriorityLog).toContain("B");
        expect(samePriorityLog).toContain("C");
    });

    it('should handle negative priorities', () => {
        const negativeLog: number[] = [];
        const negListener: Listener = {
            priority: -10,
            onBeforeEvent(ctx, event) {
                negativeLog.push(-10);
                return event;
            },
        };
        const posListener: Listener = {
            priority: 10,
            onBeforeEvent(ctx, event) {
                negativeLog.push(10);
                return event;
            },
        };

        EventQueue.process(initialState, [moveEvent], [negListener, posListener]);
        expect(negativeLog).toEqual([-10, 10]);
    });

    it('should handle sequential event modifications', () => {
        let modificationCount = 0;
        const modListener1: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    modificationCount++;
                    return new MoveEvent(
                        event.from,
                        new Vector2Int(4, 4), // First modification
                        event.piece,
                        event.actor,
                        event.isPlayerAction,
                        event.sourceId
                    );
                }
                return event;
            },
        };
        const modListener2: Listener = {
            priority: 1,
            onBeforeEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    modificationCount++;
                    return new MoveEvent(
                        event.from,
                        new Vector2Int(5, 5), // Second modification (should use first mod's result)
                        event.piece,
                        event.actor,
                        event.isPlayerAction,
                        event.sourceId
                    );
                }
                return event;
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [modListener1, modListener2]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(5, 5))).not.toBeNull();
        expect(modificationCount).toBe(2);
    });

    it('should handle cancellation after modification', () => {
        let cancelAfterMod = false;
        const modThenCancelListener1: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    return new MoveEvent(
                        event.from,
                        new Vector2Int(6, 6),
                        event.piece,
                        event.actor,
                        event.isPlayerAction,
                        event.sourceId
                    );
                }
                return event;
            },
        };
        const modThenCancelListener2: Listener = {
            priority: 1,
            onBeforeEvent(ctx, event) {
                cancelAfterMod = true;
                return null; // Cancel after modification
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [modThenCancelListener1, modThenCancelListener2]);
        expect(result.finalState.board.getPieceAt(new Vector2Int(1, 1))).not.toBeNull();
        expect(result.eventLog.length).toBe(0);
        expect(cancelAfterMod).toBe(true);
    });

    it('should handle event for destroyed piece', () => {
        const destroyThenMoveListener: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof DestroyEvent) {
                    // Try to generate a move event for the destroyed piece
                    const destroyedPiece = event.target;
                    return [
                        new MoveEvent(
                            destroyedPiece.position,
                            new Vector2Int(7, 7),
                            destroyedPiece,
                            event.actor,
                            false,
                            "listener"
                        )
                    ];
                }
                return [];
            },
        };

        const destroyEvent = new DestroyEvent(piece1, "Test", PlayerColor.White, "source");
        const result = EventQueue.process(initialState, [destroyEvent], [destroyThenMoveListener]);
        // The move event should be generated but the piece is already destroyed
        // This tests that we handle invalid events gracefully
        expect(result.eventLog.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle exploding piece scenario', () => {
        const piece3 = createMockPiece("piece3", PlayerColor.White, new Vector2Int(3, 3));
        const piece4 = createMockPiece("piece4", PlayerColor.Black, new Vector2Int(4, 4));
        const boardWithNeighbors = board.clone();
        boardWithNeighbors.placePiece(piece3, new Vector2Int(3, 3));
        boardWithNeighbors.placePiece(piece4, new Vector2Int(4, 4));
        const stateWithNeighbors = new GameState(boardWithNeighbors, PlayerColor.White, 1, []);

        let explosionCount = 0;
        const explodingListener: Listener = {
            priority: 1,
            onAfterEvent(ctx, event) {
                if (event instanceof DestroyEvent && event.target.id === "piece3") {
                    explosionCount++;
                    // Destroy all adjacent pieces
                    const adjacent: Vector2Int[] = [
                        new Vector2Int(2, 2), new Vector2Int(2, 3), new Vector2Int(2, 4),
                        new Vector2Int(3, 2), new Vector2Int(3, 4),
                        new Vector2Int(4, 2), new Vector2Int(4, 3), new Vector2Int(4, 4),
                    ];
                    const events: GameEvent[] = [];
                    for (const pos of adjacent) {
                        const neighbor = ctx.state.board.getPieceAt(pos);
                        if (neighbor) {
                            events.push(new DestroyEvent(neighbor, "Exploded", event.actor, "explosion"));
                        }
                    }
                    return events;
                }
                return [];
            },
        };

        const destroyPiece3 = new DestroyEvent(piece3, "Explode", PlayerColor.White, "source");
        const result = EventQueue.process(stateWithNeighbors, [destroyPiece3], [explodingListener]);
        expect(explosionCount).toBeGreaterThan(0);
        expect(result.eventLog.length).toBeGreaterThan(1);
        // Check that adjacent pieces were destroyed
        expect(
            result.finalState.board.getPieceAt(new Vector2Int(4, 4)) === null ||
            result.finalState.board.getPieceAt(new Vector2Int(2, 2)) === null
        ).toBe(true);
    });

    it('should handle multi-listener chain reaction', () => {
        // Set up board with pieces for chain reaction
        const boardWithChain = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        const chainPieceA = createMockPiece("chainA", PlayerColor.White, new Vector2Int(0, 0));
        const chainPieceB = createMockPiece("chainB", PlayerColor.White, new Vector2Int(0, 1));
        boardWithChain.placePiece(piece1, new Vector2Int(1, 1));
        boardWithChain.placePiece(chainPieceA, new Vector2Int(0, 0));
        boardWithChain.placePiece(chainPieceB, new Vector2Int(0, 1));
        const stateWithChain = new GameState(boardWithChain, PlayerColor.White, 1, []);

        let chainA = 0;
        let chainB = 0;
        const chainListenerA: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof DestroyEvent && chainA < 2) {
                    chainA++;
                    const targetPiece = ctx.state.board.getPieceAt(new Vector2Int(0, 0));
                    if (targetPiece) {
                        return [new DestroyEvent(
                            targetPiece,
                            "Chain A",
                            event.actor,
                            "chainA"
                        )];
                    }
                }
                return [];
            },
        };
        const chainListenerB: Listener = {
            priority: 1,
            onAfterEvent(ctx, event) {
                if (event instanceof DestroyEvent && chainB < 2) {
                    chainB++;
                    const targetPiece = ctx.state.board.getPieceAt(new Vector2Int(0, 1));
                    if (targetPiece) {
                        return [new DestroyEvent(
                            targetPiece,
                            "Chain B",
                            event.actor,
                            "chainB"
                        )];
                    }
                }
                return [];
            },
        };

        const initialDestroy = new DestroyEvent(piece1, "Initial", PlayerColor.White, "source");
        const result = EventQueue.process(stateWithChain, [initialDestroy], [chainListenerA, chainListenerB]);
        expect(result.eventLog.length).toBeGreaterThanOrEqual(3);
        expect(chainA).toBeGreaterThan(0);
        expect(chainB).toBeGreaterThan(0);
    });

    it('should let listeners see live state', () => {
        let sawUpdatedState = false;
        const stateAwareListener: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Check if piece is actually at new position
                    const pieceAtNewPos = ctx.state.board.getPieceAt(event.to);
                    if (pieceAtNewPos && pieceAtNewPos.id === event.piece.id) {
                        sawUpdatedState = true;
                    }
                }
                return [];
            },
        };

        EventQueue.process(initialState, [moveEvent], [stateAwareListener]);
        expect(sawUpdatedState).toBe(true);
    });

    it('should maintain correct event log order', () => {
        const orderListener: Listener = {
            priority: 0,
            onAfterEvent(ctx, event) {
                if (event instanceof MoveEvent) {
                    // Get the piece from the updated state at its new position
                    const movedPiece = ctx.state.board.getPieceAt(event.to);
                    if (movedPiece) {
                        return [new DestroyEvent(movedPiece, "After move", event.actor, "order")];
                    }
                }
                return [];
            },
        };

        const result = EventQueue.process(initialState, [moveEvent], [orderListener]);
        expect(result.eventLog.length).toBe(2);
        expect(result.eventLog[0]).toBeInstanceOf(MoveEvent);
        expect(result.eventLog[1]).toBeInstanceOf(DestroyEvent);
    });

    it('should handle partial cancellation', () => {
        let eventCount = 0;
        const cancelSomeListener: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                // Cancel first event, allow second
                eventCount++;
                if (eventCount === 1) {
                    return null; // Cancel first event
                }
                return event; // Allow second event
            },
        };

        const event1 = new MoveEvent(new Vector2Int(1, 1), new Vector2Int(2, 2), piece1, PlayerColor.White, true, piece1.id);
        const event2 = new MoveEvent(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1, PlayerColor.White, true, piece1.id);
        const result = EventQueue.process(initialState, [event1, event2], [cancelSomeListener]);
        // First event should be cancelled, second should proceed
        expect(result.eventLog.length).toBe(1);
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
    });

    it('should handle capture with multiple listeners', () => {
        let captureListener1Called = false;
        let captureListener2Called = false;
        const captureListener1: Listener = {
            priority: 0,
            onBeforeEvent(ctx, event) {
                if (event instanceof CaptureEvent) {
                    captureListener1Called = true;
                }
                return event;
            },
        };
        const captureListener2: Listener = {
            priority: 1,
            onAfterEvent(ctx, event) {
                if (event instanceof CaptureEvent) {
                    captureListener2Called = true;
                    // Generate destroy event for attacker
                    return [new DestroyEvent(event.attacker, "Revenge", event.actor, "revenge")];
                }
                return [];
            },
        };

        const captureEvent = new CaptureEvent(piece1, piece2, PlayerColor.White, true);
        const result = EventQueue.process(initialState, [captureEvent], [captureListener1, captureListener2]);
        expect(captureListener1Called).toBe(true);
        expect(captureListener2Called).toBe(true);
        expect(result.eventLog.length).toBe(2);
    });
});
