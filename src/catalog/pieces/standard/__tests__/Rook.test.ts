/**
 * Tests for Rook piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/Rook.test.ts
 */

import { Rook } from "../Rook";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { Pawn } from "../Pawn";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Rook horizontal movement
console.log("--- Test 1: Rook Horizontal Movement ---");
{
    const board = new Board(8, 8);
    const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(rook, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = rook.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 3))), "Rook should move left");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(7, 3))), "Rook should move right");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(3, 3))), "Rook should not stay in place");
}

// Test 2: Rook vertical movement
console.log("--- Test 2: Rook Vertical Movement ---");
{
    const board = new Board(8, 8);
    const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(rook, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = rook.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(3, 0))), "Rook should move up");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(3, 7))), "Rook should move down");
}

// Test 3: Rook cannot move diagonally
console.log("--- Test 3: Rook Cannot Move Diagonally ---");
{
    const board = new Board(8, 8);
    const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(rook, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = rook.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(4, 4))), "Rook should not move diagonally");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(2, 2))), "Rook should not move diagonally");
}

// Test 4: Rook blocked by friendly piece
console.log("--- Test 4: Rook Blocked by Friendly Piece ---");
{
    const board = new Board(8, 8);
    const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
    const blocker = new Pawn(PlayerColor.White, new Vector2Int(5, 3));
    board.placePiece(rook, new Vector2Int(3, 3));
    board.placePiece(blocker, new Vector2Int(5, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = rook.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 3))), "Rook should not capture friendly");
    assertTrue(!moves.moves.some(m => m.to.x > 5 && m.to.y === 3), "Rook should not move through friendly");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(4, 3))), "Rook should move up to blocker");
}

// Test 5: Rook can capture enemy piece
console.log("--- Test 5: Rook Can Capture Enemy Piece ---");
{
    const board = new Board(8, 8);
    const rook = new Rook(PlayerColor.White, new Vector2Int(3, 3));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 3));
    board.placePiece(rook, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(5, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = rook.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 3)) && m.isCapture);
    assertTrue(captureMove !== undefined, "Rook should be able to capture enemy");
    assertTrue(!moves.moves.some(m => m.to.x > 5 && m.to.y === 3), "Rook should not move through enemy");
}

// Test 6: Rook value
console.log("--- Test 6: Rook Value ---");
{
    const rook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
    assertTrue(rook.getValue() === 5, "Rook should have value 5");
}

console.log("\n=== Rook Tests Complete ===");

