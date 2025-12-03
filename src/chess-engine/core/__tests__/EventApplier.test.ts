/**
 * Tests for EventApplier
 * Run with: npx tsx src/chess-engine/core/__tests__/EventApplier.test.ts
 */

import { EventApplier } from "../EventApplier";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import {
    MoveEvent,
    CaptureEvent,
    DestroyEvent,
    TurnAdvancedEvent,
    TileChangedEvent,
    PieceChangedEvent,
} from "../../events/EventRegistry";
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

// Mock piece and tile factories
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

console.log("=== EventApplier Tests ===\n");

// Setup: Create a simple board state
const board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
const piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
const piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(2, 2));
board.placePiece(piece1, new Vector2Int(1, 1));
board.placePiece(piece2, new Vector2Int(2, 2));

const initialState = new GameState(board, PlayerColor.White, 1, []);

// Test 1: MoveEvent
console.log("--- Test 1: MoveEvent ---");
const moveEvent = new MoveEvent(
    new Vector2Int(1, 1),
    new Vector2Int(3, 3),
    piece1,
    PlayerColor.White,
    true,
    piece1.id
);
const moveResult = EventApplier.applyEvent(moveEvent, initialState);
assertTrue(moveResult.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Piece moved to new position");
assertTrue(moveResult.board.getPieceAt(new Vector2Int(1, 1)) === null, "Piece removed from old position");
const movedPiece = moveResult.board.getPieceAt(new Vector2Int(3, 3));
assertTrue(movedPiece !== null && movedPiece.movesMade === 1, "MovesMade incremented");
console.log();

// Test 2: CaptureEvent
console.log("--- Test 2: CaptureEvent ---");
const captureEvent = new CaptureEvent(piece1, piece2, PlayerColor.White, true);
const captureResult = EventApplier.applyEvent(captureEvent, initialState);
assertTrue(captureResult.board.getPieceAt(new Vector2Int(2, 2)) === null, "Target piece removed");
console.log();

// Test 3: DestroyEvent
console.log("--- Test 3: DestroyEvent ---");
const destroyEvent = new DestroyEvent(piece2, "Test destruction", PlayerColor.White, "source");
const destroyResult = EventApplier.applyEvent(destroyEvent, initialState);
assertTrue(destroyResult.board.getPieceAt(new Vector2Int(2, 2)) === null, "Piece destroyed");
console.log();

// Test 4: TurnAdvancedEvent
console.log("--- Test 4: TurnAdvancedEvent ---");
const turnAdvancedEvent = new TurnAdvancedEvent(PlayerColor.Black, 2);
const turnResult = EventApplier.applyEvent(turnAdvancedEvent, initialState);
assertEquals(turnResult.currentPlayer, PlayerColor.Black, "Player changed");
assertEquals(turnResult.turnNumber, 2, "Turn number incremented");
console.log();

// Test 5: TileChangedEvent
console.log("--- Test 5: TileChangedEvent ---");
const newTile = createMockTile("newTile", new Vector2Int(4, 4));
const tileChangedEvent = new TileChangedEvent(new Vector2Int(4, 4), newTile, PlayerColor.White);
const tileResult = EventApplier.applyEvent(tileChangedEvent, initialState);
const changedTile = tileResult.board.getTile(new Vector2Int(4, 4));
assertTrue(changedTile.id === "newTile", "Tile changed");
console.log();

// Test 6: PieceChangedEvent
console.log("--- Test 6: PieceChangedEvent ---");
const newPiece = createMockPiece("newPiece", PlayerColor.White, new Vector2Int(1, 1));
const pieceChangedEvent = new PieceChangedEvent(
    piece1,
    newPiece,
    new Vector2Int(1, 1),
    PlayerColor.White,
    "source"
);
const pieceChangedResult = EventApplier.applyEvent(pieceChangedEvent, initialState);
const transformedPiece = pieceChangedResult.board.getPieceAt(new Vector2Int(1, 1));
assertTrue(transformedPiece !== null && transformedPiece.id === "newPiece", "Piece transformed");
console.log();

// Test 7: State immutability
console.log("--- Test 7: State Immutability ---");
const originalPiece = initialState.board.getPieceAt(new Vector2Int(1, 1));
const testMove = new MoveEvent(
    new Vector2Int(1, 1),
    new Vector2Int(5, 5),
    piece1,
    PlayerColor.White,
    true,
    piece1.id
);
const newState = EventApplier.applyEvent(testMove, initialState);
assertTrue(initialState.board.getPieceAt(new Vector2Int(1, 1)) !== null, "Original state unchanged");
assertTrue(newState.board.getPieceAt(new Vector2Int(5, 5)) !== null, "New state has moved piece");
console.log();

console.log("=== All EventApplier Tests Complete ===");
if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All tests passed!");
}

