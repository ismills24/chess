/**
 * Tests for Queen piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/Queen.test.ts
 */

import { Queen } from "../Queen";
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

// Test 1: Queen horizontal and vertical movement
console.log("--- Test 1: Queen Horizontal and Vertical Movement ---");
{
    const board = new Board(8, 8);
    const queen = new Queen(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(queen, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = queen.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 3))), "Queen should move left");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(7, 3))), "Queen should move right");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(3, 0))), "Queen should move up");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(3, 7))), "Queen should move down");
}

// Test 2: Queen diagonal movement
console.log("--- Test 2: Queen Diagonal Movement ---");
{
    const board = new Board(8, 8);
    const queen = new Queen(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(queen, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = queen.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 0))), "Queen should move NW");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(7, 7))), "Queen should move SE");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 6))), "Queen should move SW");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(6, 0))), "Queen should move NE");
}

// Test 3: Queen blocked by friendly piece
console.log("--- Test 3: Queen Blocked by Friendly Piece ---");
{
    const board = new Board(8, 8);
    const queen = new Queen(PlayerColor.White, new Vector2Int(3, 3));
    const blocker = new Pawn(PlayerColor.White, new Vector2Int(5, 3));
    board.placePiece(queen, new Vector2Int(3, 3));
    board.placePiece(blocker, new Vector2Int(5, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = queen.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 3))), "Queen should not capture friendly");
    assertTrue(!moves.moves.some(m => m.to.x > 5 && m.to.y === 3), "Queen should not move through friendly");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(4, 3))), "Queen should move up to blocker");
}

// Test 4: Queen can capture enemy piece
console.log("--- Test 4: Queen Can Capture Enemy Piece ---");
{
    const board = new Board(8, 8);
    const queen = new Queen(PlayerColor.White, new Vector2Int(3, 3));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 3));
    board.placePiece(queen, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(5, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = queen.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 3)) && m.isCapture);
    assertTrue(captureMove !== undefined, "Queen should be able to capture enemy");
}

// Test 5: Queen value
console.log("--- Test 5: Queen Value ---");
{
    const queen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
    assertTrue(queen.getValue() === 9, "Queen should have value 9");
}

console.log("\n=== Queen Tests Complete ===");

