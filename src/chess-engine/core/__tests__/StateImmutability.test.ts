/**
 * Deep immutability tests for GameState and Board
 * Run with: npx tsx src/chess-engine/core/__tests__/StateImmutability.test.ts
 */

import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { EventApplier } from "../EventApplier";
import { MoveEvent, CaptureEvent, DestroyEvent } from "../../events/EventRegistry";
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

function assertNotEqual<T>(actual: T, expected: T, testName: string): void {
    // For object identity checks, use reference comparison
    if (actual !== expected) {
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

console.log("=== State Immutability Tests ===\n");

// Setup
const board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
const piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
const piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(2, 2));
board.placePiece(piece1, new Vector2Int(1, 1));
board.placePiece(piece2, new Vector2Int(2, 2));
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Test 1: Board clone creates new instance
console.log("--- Test 1: Board Clone Creates New Instance ---");
const clonedBoard = initialState.board.clone();
assertNotEqual(clonedBoard, initialState.board, "Cloned board is different object");
assertTrue(clonedBoard.width === initialState.board.width, "Cloned board has same dimensions");
console.log();

// Test 2: Modifying cloned board doesn't affect original
console.log("--- Test 2: Cloned Board Independence ---");
const piece3 = createMockPiece("piece3", PlayerColor.White, new Vector2Int(3, 3));
clonedBoard.placePiece(piece3, new Vector2Int(3, 3));
assertTrue(clonedBoard.getPieceAt(new Vector2Int(3, 3)) !== null, "Piece added to clone");
assertTrue(initialState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Original board unchanged");
console.log();

// Test 3: GameState clone creates new instance
console.log("--- Test 3: GameState Clone Creates New Instance ---");
const clonedState = initialState.clone();
assertNotEqual(clonedState, initialState, "Cloned state is different object");
assertTrue(clonedState.currentPlayer === initialState.currentPlayer, "Cloned state has same player");
console.log();

// Test 4: Modifying cloned state doesn't affect original
console.log("--- Test 4: Cloned State Independence ---");
const newBoard = clonedState.board.clone();
const piece4 = createMockPiece("piece4", PlayerColor.Black, new Vector2Int(4, 4));
newBoard.placePiece(piece4, new Vector2Int(4, 4));
const modifiedState = new GameState(newBoard, PlayerColor.Black, 2, []);
assertTrue(modifiedState.board.getPieceAt(new Vector2Int(4, 4)) !== null, "Piece added to modified state");
assertTrue(initialState.board.getPieceAt(new Vector2Int(4, 4)) === null, "Original state unchanged");
console.log();

// Test 5: Event application doesn't mutate original state
console.log("--- Test 5: Event Application Immutability ---");
const moveEvent = new MoveEvent(
    new Vector2Int(1, 1),
    new Vector2Int(5, 5),
    piece1,
    PlayerColor.White,
    true,
    piece1.id
);
const originalPiece = initialState.board.getPieceAt(new Vector2Int(1, 1));
const newState = EventApplier.applyEvent(moveEvent, initialState);
assertTrue(initialState.board.getPieceAt(new Vector2Int(1, 1)) !== null, "Original state unchanged");
assertTrue(newState.board.getPieceAt(new Vector2Int(5, 5)) !== null, "New state has moved piece");
assertTrue(originalPiece !== null && originalPiece.movesMade === 0, "Original piece unchanged");
const movedPiece = newState.board.getPieceAt(new Vector2Int(5, 5));
assertTrue(movedPiece !== null && movedPiece.movesMade === 1, "New piece has updated movesMade");
console.log();

// Test 6: Nested object immutability (pieces array)
console.log("--- Test 6: Nested Object Immutability ---");
const originalPieces = initialState.board.getAllPieces();
const afterMovePieces = newState.board.getAllPieces();
assertNotEqual(originalPieces, afterMovePieces, "Pieces arrays are different");
assertTrue(originalPieces.length === afterMovePieces.length, "Same number of pieces");
// Verify pieces themselves are different objects
const originalPiece1 = originalPieces.find(p => p.id === "piece1");
const newPiece1 = afterMovePieces.find(p => p.id === "piece1");
assertNotEqual(originalPiece1, newPiece1, "Piece objects are different instances");
console.log();

// Test 7: Multiple event applications maintain immutability
console.log("--- Test 7: Multiple Event Applications ---");
const captureEvent = new CaptureEvent(piece1, piece2, PlayerColor.White, true);
const stateAfterCapture = EventApplier.applyEvent(captureEvent, newState);
assertTrue(initialState.board.getPieceAt(new Vector2Int(2, 2)) !== null, "Original state still has piece2");
assertTrue(newState.board.getPieceAt(new Vector2Int(2, 2)) !== null, "Intermediate state still has piece2");
assertTrue(stateAfterCapture.board.getPieceAt(new Vector2Int(2, 2)) === null, "Final state has piece2 removed");
console.log();

// Test 8: Move history immutability
console.log("--- Test 8: Move History Immutability ---");
const stateWithHistory = initialState.withUpdatedState({ turnNumber: 2 });
assertTrue(initialState.turnNumber === 1, "Original turn number unchanged");
assertTrue(stateWithHistory.turnNumber === 2, "New state has updated turn");
assertTrue(initialState.moveHistory !== stateWithHistory.moveHistory, "Move history arrays are different instances");
console.log();

// Test 9: Piece position immutability
console.log("--- Test 9: Piece Position Immutability ---");
const originalPosition = piece1.position;
const pieceAtNewPos = newState.board.getPieceAt(new Vector2Int(5, 5));
assertTrue(originalPosition.equals(new Vector2Int(1, 1)), "Original piece position unchanged");
assertTrue(pieceAtNewPos !== null && pieceAtNewPos.position.equals(new Vector2Int(5, 5)), "New piece has new position");
assertNotEqual(originalPosition, pieceAtNewPos?.position, "Positions are different objects");
console.log();

// Test 10: Deep clone of board with multiple pieces
console.log("--- Test 10: Deep Clone with Multiple Pieces ---");
const multiPieceBoard = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
for (let i = 0; i < 5; i++) {
    const p = createMockPiece(`piece${i}`, PlayerColor.White, new Vector2Int(i, i));
    multiPieceBoard.placePiece(p, new Vector2Int(i, i));
}
const multiPieceState = new GameState(multiPieceBoard, PlayerColor.White, 1, []);
const clonedMultiState = multiPieceState.clone();
assertTrue(multiPieceState.board.getAllPieces().length === clonedMultiState.board.getAllPieces().length, "Same number of pieces");
// Verify all pieces are different instances
const originalPieces2 = multiPieceState.board.getAllPieces();
const clonedPieces2 = clonedMultiState.board.getAllPieces();
for (let i = 0; i < originalPieces2.length; i++) {
    assertNotEqual(originalPieces2[i], clonedPieces2[i], `Piece ${i} is different instance`);
}
console.log();

console.log("=== All Immutability Tests Complete ===");
if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All immutability tests passed!");
}

