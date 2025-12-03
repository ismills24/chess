/**
 * Tests for EventQueue - listener queue processing
 * Run with: npx tsx src/chess-engine/core/__tests__/EventQueue.test.ts
 */

import { EventQueue } from "../EventQueue";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Listener, ListenerContext } from "../../listeners";
import { GameEvent, MoveEvent, DestroyEvent, CaptureEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";

// Test helpers
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

function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
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

console.log("=== EventQueue Tests ===\n");

// Setup: Create a simple board state
const board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
const piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
board.placePiece(piece1, new Vector2Int(1, 1));
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Test 1: Basic event processing (no listeners)
console.log("--- Test 1: Basic Event Processing (No Listeners) ---");
const moveEvent = new MoveEvent(
    new Vector2Int(1, 1),
    new Vector2Int(3, 3),
    piece1,
    PlayerColor.White,
    true,
    piece1.id
);
const result1 = EventQueue.process(initialState, [moveEvent], []);
assertTrue(result1.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Event applied");
assertEquals(result1.eventLog.length, 1, "Event log has one event");
console.log();

// Test 2: onBeforeEvent modifies event
console.log("--- Test 2: onBeforeEvent Modifies Event ---");
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

const result2 = EventQueue.process(initialState, [moveEvent], [modifyingListener]);
assertTrue(result2.finalState.board.getPieceAt(new Vector2Int(5, 5)) !== null, "Modified destination applied");
assertTrue(result2.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Original destination not used");
console.log();

// Test 3: onBeforeEvent cancels event
console.log("--- Test 3: onBeforeEvent Cancels Event ---");
const cancelingListener: Listener = {
    priority: 0,
    onBeforeEvent(ctx, event) {
        return null; // Cancel all events
    },
};

const result3 = EventQueue.process(initialState, [moveEvent], [cancelingListener]);
assertTrue(result3.finalState.board.getPieceAt(new Vector2Int(1, 1)) !== null, "Piece still at original position");
assertEquals(result3.eventLog.length, 0, "No events in log");
console.log();

// Test 4: onAfterEvent generates new events
console.log("--- Test 4: onAfterEvent Generates New Events ---");
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

const result4 = EventQueue.process(initialState, [moveEvent], [generatingListener]);
assertTrue(result4.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Piece destroyed after move");
assertEquals(result4.eventLog.length, 2, "Two events in log (move + destroy)");
console.log();

// Test 5: Priority ordering (lower = earlier)
console.log("--- Test 5: Priority Ordering ---");
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
assertEquals(orderLog, [0, 5, 10], "Listeners called in priority order (lower first)");
console.log();

// Test 6: Chain reaction (event generates event that generates event)
console.log("--- Test 6: Chain Reaction ---");
let chainCount = 0;
const chainListener: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        chainCount++;
        if (chainCount < 3 && event instanceof DestroyEvent) {
            // Generate another destroy event
            const newPiece = createMockPiece(`piece${chainCount}`, PlayerColor.White, new Vector2Int(chainCount, chainCount));
            return [new DestroyEvent(newPiece, "Chain reaction", PlayerColor.White, "chain")];
        }
        return [];
    },
};

const destroyEvent = new DestroyEvent(piece1, "Initial", PlayerColor.White, "source");
const result6 = EventQueue.process(initialState, [destroyEvent], [chainListener]);
assertTrue(result6.eventLog.length >= 3, "Chain reaction generated multiple events");
console.log();

// Test 7: onAfterEvent not called if event cancelled
console.log("--- Test 7: onAfterEvent Not Called If Cancelled ---");
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
assertTrue(!afterCalled, "onAfterEvent not called when event cancelled");
console.log();

// Test 8: Multiple listeners, some modify, some generate
// Test 8: onBeforeEvent Returns Array (Multi-Event Replacement)
console.log("--- Test 8: onBeforeEvent Returns Array (Multi-Event Replacement) ---");
{
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
    assertEquals(result.eventLog.length, 2, "Should have 2 events in log");
    assertTrue(result.eventLog[0] instanceof DestroyEvent, "First event should be DestroyEvent");
    assertTrue(result.eventLog[1] instanceof MoveEvent, "Second event should be MoveEvent");
    
    // Piece2 should be destroyed, piece1 should be moved
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(1, 1)) === null, "Piece2 should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.id === "p1", "Piece1 should be moved");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(0, 0)) === null, "Piece1 should not be at original position");
}
console.log();

// Test 9: Multiple Listeners Interact
console.log("--- Test 9: Multiple Listeners Interact ---");
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

const result8 = EventQueue.process(initialState, [moveEvent], [modifyListener, generateListener]);
assertTrue(result8.finalState.board.getPieceAt(new Vector2Int(7, 7)) === null, "Piece moved then destroyed");
assertEquals(result8.eventLog.length, 2, "Two events (modified move + destroy)");
console.log();

console.log("=== All EventQueue Tests Complete ===");
if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All tests passed!");
}

