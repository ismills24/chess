/**
 * Tests for Knight piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/Knight.test.ts
 */

import { Knight } from "../Knight";
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

// Test 1: Knight L-shaped movement
console.log("--- Test 1: Knight L-Shaped Movement ---");
{
    const board = new Board(8, 8);
    const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(knight, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = knight.getCandidateMoves(state);
    // All 8 L-shaped moves from (3,3)
    const expectedMoves = [
        new Vector2Int(5, 4), new Vector2Int(5, 2),
        new Vector2Int(1, 4), new Vector2Int(1, 2),
        new Vector2Int(4, 5), new Vector2Int(4, 1),
        new Vector2Int(2, 5), new Vector2Int(2, 1),
    ];
    
    for (const expected of expectedMoves) {
        assertTrue(moves.moves.some(m => m.to.equals(expected)), `Knight should move to ${expected}`);
    }
}

// Test 2: Knight can jump over pieces
console.log("--- Test 2: Knight Can Jump Over Pieces ---");
{
    const board = new Board(8, 8);
    const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
    const blocker = new Pawn(PlayerColor.White, new Vector2Int(3, 4));
    board.placePiece(knight, new Vector2Int(3, 3));
    board.placePiece(blocker, new Vector2Int(3, 4));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = knight.getCandidateMoves(state);
    // Should still be able to move to (4, 5) even with blocker at (3, 4)
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(4, 5))), "Knight should jump over blocker");
}

// Test 3: Knight cannot capture friendly
console.log("--- Test 3: Knight Cannot Capture Friendly ---");
{
    const board = new Board(8, 8);
    const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(5, 4));
    board.placePiece(knight, new Vector2Int(3, 3));
    board.placePiece(friendly, new Vector2Int(5, 4));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = knight.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 4))), "Knight should not capture friendly");
}

// Test 4: Knight can capture enemy
console.log("--- Test 4: Knight Can Capture Enemy ---");
{
    const board = new Board(8, 8);
    const knight = new Knight(PlayerColor.White, new Vector2Int(3, 3));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 4));
    board.placePiece(knight, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(5, 4));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = knight.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 4)) && m.isCapture);
    assertTrue(captureMove !== undefined, "Knight should be able to capture enemy");
}

// Test 5: Knight value
console.log("--- Test 5: Knight Value ---");
{
    const knight = new Knight(PlayerColor.White, new Vector2Int(0, 0));
    assertTrue(knight.getValue() === 3, "Knight should have value 3");
}

console.log("\n=== Knight Tests Complete ===");

