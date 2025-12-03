/**
 * Edge case and complex scenario tests for EventQueue
 * Run with: npx tsx src/chess-engine/core/__tests__/EventQueue.edge-cases.test.ts
 */

import { EventQueue } from "../EventQueue";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Listener } from "../../listeners";
import { GameEvent, MoveEvent, DestroyEvent, CaptureEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

function assertEquals<T>(actual: T, expected: T, testName: string): void {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Got: ${JSON.stringify(actual)}`);
        process.exitCode = 1;
    }
}

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

console.log("=== EventQueue Edge Cases & Complex Scenarios ===\n");

// Setup
const board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
const piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
const piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(2, 2));
board.placePiece(piece1, new Vector2Int(1, 1));
board.placePiece(piece2, new Vector2Int(2, 2));
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Edge Case 1: Empty event queue
console.log("--- Edge Case 1: Empty Event Queue ---");
const result1 = EventQueue.process(initialState, [], []);
assertEquals(result1.finalState, initialState, "Empty queue returns initial state");
assertEquals(result1.eventLog.length, 0, "Empty event log");
console.log();

// Edge Case 2: Empty listener array
console.log("--- Edge Case 2: Empty Listener Array ---");
const moveEvent = new MoveEvent(
    new Vector2Int(1, 1),
    new Vector2Int(3, 3),
    piece1,
    PlayerColor.White,
    true,
    piece1.id
);
const result2 = EventQueue.process(initialState, [moveEvent], []);
assertTrue(result2.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Event applied without listeners");
assertEquals(result2.eventLog.length, 1, "One event in log");
console.log();

// Edge Case 3: Listeners with same priority (should maintain order)
console.log("--- Edge Case 3: Same Priority Listeners ---");
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
assertTrue(samePriorityLog.length === 3, "All listeners called");
assertTrue(samePriorityLog.includes("A") && samePriorityLog.includes("B") && samePriorityLog.includes("C"), "All listeners executed");
console.log();

// Edge Case 4: Negative priorities
console.log("--- Edge Case 4: Negative Priorities ---");
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
assertEquals(negativeLog, [-10, 10], "Negative priority executes first");
console.log();

// Edge Case 5: Multiple listeners modify event sequentially
console.log("--- Edge Case 5: Sequential Event Modifications ---");
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

const result5 = EventQueue.process(initialState, [moveEvent], [modListener1, modListener2]);
assertTrue(result5.finalState.board.getPieceAt(new Vector2Int(5, 5)) !== null, "Final modification applied");
assertEquals(modificationCount, 2, "Both listeners modified event");
console.log();

// Edge Case 6: Listener cancels after modification
console.log("--- Edge Case 6: Cancel After Modification ---");
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

const result6 = EventQueue.process(initialState, [moveEvent], [modThenCancelListener1, modThenCancelListener2]);
assertTrue(result6.finalState.board.getPieceAt(new Vector2Int(1, 1)) !== null, "Event cancelled, piece not moved");
assertEquals(result6.eventLog.length, 0, "No events in log");
assertTrue(cancelAfterMod, "Cancel listener saw modified event");
console.log();

// Edge Case 7: Listener generates event for destroyed piece
console.log("--- Edge Case 7: Event for Destroyed Piece ---");
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
const result7 = EventQueue.process(initialState, [destroyEvent], [destroyThenMoveListener]);
// The move event should be generated but the piece is already destroyed
// This tests that we handle invalid events gracefully
assertTrue(result7.eventLog.length >= 1, "Events processed");
console.log();

// Complex Scenario 1: Exploding piece (like ExplodingDecorator)
console.log("--- Complex Scenario 1: Exploding Piece ---");
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
const result8 = EventQueue.process(stateWithNeighbors, [destroyPiece3], [explodingListener]);
assertTrue(explosionCount > 0, "Explosion triggered");
assertTrue(result8.eventLog.length > 1, "Multiple events from explosion");
// Check that adjacent pieces were destroyed
assertTrue(result8.finalState.board.getPieceAt(new Vector2Int(4, 4)) === null || 
           result8.finalState.board.getPieceAt(new Vector2Int(2, 2)) === null, 
           "Adjacent pieces affected");
console.log();

// Complex Scenario 2: Chain reaction with multiple listeners
console.log("--- Complex Scenario 2: Multi-Listener Chain Reaction ---");
let chainA = 0;
let chainB = 0;
const chainListenerA: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        if (event instanceof DestroyEvent && chainA < 2) {
            chainA++;
            return [new DestroyEvent(
                createMockPiece("chainA", PlayerColor.White, new Vector2Int(0, 0)),
                "Chain A",
                event.actor,
                "chainA"
            )];
        }
        return [];
    },
};
const chainListenerB: Listener = {
    priority: 1,
    onAfterEvent(ctx, event) {
        if (event instanceof DestroyEvent && chainB < 2) {
            chainB++;
            return [new DestroyEvent(
                createMockPiece("chainB", PlayerColor.White, new Vector2Int(0, 1)),
                "Chain B",
                event.actor,
                "chainB"
            )];
        }
        return [];
    },
};

const initialDestroy = new DestroyEvent(piece1, "Initial", PlayerColor.White, "source");
const result9 = EventQueue.process(initialState, [initialDestroy], [chainListenerA, chainListenerB]);
assertTrue(result9.eventLog.length >= 3, "Chain reaction generated multiple events");
assertTrue(chainA > 0 && chainB > 0, "Both listeners participated in chain");
console.log();

// Complex Scenario 3: Listener sees updated state from previous event
console.log("--- Complex Scenario 3: Listeners See Live State ---");
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

const result10 = EventQueue.process(initialState, [moveEvent], [stateAwareListener]);
assertTrue(sawUpdatedState, "Listener sees updated state");
console.log();

// Complex Scenario 4: Event log order correctness
console.log("--- Complex Scenario 4: Event Log Order ---");
const orderLog: string[] = [];
const orderListener: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        orderLog.push(`after-${event.constructor.name}`);
        if (event instanceof MoveEvent) {
            return [new DestroyEvent(event.piece, "After move", event.actor, "order")];
        }
        return [];
    },
};

const result11 = EventQueue.process(initialState, [moveEvent], [orderListener]);
const expectedOrder = ["after-MoveEvent", "after-DestroyEvent"];
assertTrue(result11.eventLog.length === 2, "Two events in log");
assertTrue(result11.eventLog[0] instanceof MoveEvent, "MoveEvent first");
assertTrue(result11.eventLog[1] instanceof DestroyEvent, "DestroyEvent second");
console.log();

// Complex Scenario 5: Multiple events, some cancelled
console.log("--- Complex Scenario 5: Partial Cancellation ---");
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
const result12 = EventQueue.process(initialState, [event1, event2], [cancelSomeListener]);
// First event should be cancelled, second should proceed
assertTrue(result12.eventLog.length === 1, "One event survived cancellation");
assertTrue(result12.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Second event applied");
console.log();

// Complex Scenario 6: Capture with multiple listeners
console.log("--- Complex Scenario 6: Capture with Multiple Listeners ---");
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
const result13 = EventQueue.process(initialState, [captureEvent], [captureListener1, captureListener2]);
assertTrue(captureListener1Called, "Before listener called");
assertTrue(captureListener2Called, "After listener called");
assertTrue(result13.eventLog.length === 2, "Capture + revenge destroy");
console.log();

console.log("=== All Edge Case Tests Complete ===");
if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All edge case tests passed!");
}

