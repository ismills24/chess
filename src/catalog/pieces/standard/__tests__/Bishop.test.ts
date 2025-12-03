/**
 * Tests for Bishop piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/Bishop.test.ts
 */

import { Bishop } from "../Bishop";
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

// Test 1: Bishop diagonal movement
console.log("--- Test 1: Bishop Diagonal Movement ---");
{
    const board = new Board(8, 8);
    const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(bishop, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = bishop.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 0))), "Bishop should move NW");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(7, 7))), "Bishop should move SE");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(0, 6))), "Bishop should move SW");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(6, 0))), "Bishop should move NE");
}

// Test 2: Bishop cannot move horizontally or vertically
console.log("--- Test 2: Bishop Cannot Move Horizontally or Vertically ---");
{
    const board = new Board(8, 8);
    const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(bishop, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = bishop.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 3))), "Bishop should not move horizontally");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(3, 5))), "Bishop should not move vertically");
}

// Test 3: Bishop blocked by friendly piece
console.log("--- Test 3: Bishop Blocked by Friendly Piece ---");
{
    const board = new Board(8, 8);
    const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
    const blocker = new Pawn(PlayerColor.White, new Vector2Int(5, 5));
    board.placePiece(bishop, new Vector2Int(3, 3));
    board.placePiece(blocker, new Vector2Int(5, 5));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = bishop.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 5))), "Bishop should not capture friendly");
    assertTrue(!moves.moves.some(m => m.to.x > 5 && m.to.y > 5), "Bishop should not move through friendly");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(4, 4))), "Bishop should move up to blocker");
}

// Test 4: Bishop can capture enemy piece
console.log("--- Test 4: Bishop Can Capture Enemy Piece ---");
{
    const board = new Board(8, 8);
    const bishop = new Bishop(PlayerColor.White, new Vector2Int(3, 3));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
    board.placePiece(bishop, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(5, 5));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = bishop.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(5, 5)) && m.isCapture);
    assertTrue(captureMove !== undefined, "Bishop should be able to capture enemy");
    assertTrue(!moves.moves.some(m => m.to.x > 5 && m.to.y > 5), "Bishop should not move through enemy");
}

// Test 5: Bishop value
console.log("--- Test 5: Bishop Value ---");
{
    const bishop = new Bishop(PlayerColor.White, new Vector2Int(0, 0));
    assertTrue(bishop.getValue() === 3, "Bishop should have value 3");
}

console.log("\n=== Bishop Tests Complete ===");

