/**
 * Tests for King piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/King.test.ts
 */

import { King } from "../King";
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

// Test 1: King moves one square in all directions
console.log("--- Test 1: King Moves One Square in All Directions ---");
{
    const board = new Board(8, 8);
    const king = new King(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(king, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = king.getCandidateMoves(state);
    // All 8 adjacent squares
    const expectedMoves = [
        new Vector2Int(2, 2), new Vector2Int(3, 2), new Vector2Int(4, 2),
        new Vector2Int(2, 3), new Vector2Int(4, 3),
        new Vector2Int(2, 4), new Vector2Int(3, 4), new Vector2Int(4, 4),
    ];
    
    for (const expected of expectedMoves) {
        assertTrue(moves.moves.some(m => m.to.equals(expected)), `King should move to ${expected}`);
    }
}

// Test 2: King cannot move more than one square
console.log("--- Test 2: King Cannot Move More Than One Square ---");
{
    const board = new Board(8, 8);
    const king = new King(PlayerColor.White, new Vector2Int(3, 3));
    board.placePiece(king, new Vector2Int(3, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = king.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 3))), "King should not move 2 squares");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(3, 5))), "King should not move 2 squares");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(5, 5))), "King should not move 2 squares diagonally");
}

// Test 3: King cannot capture friendly
console.log("--- Test 3: King Cannot Capture Friendly ---");
{
    const board = new Board(8, 8);
    const king = new King(PlayerColor.White, new Vector2Int(3, 3));
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(4, 3));
    board.placePiece(king, new Vector2Int(3, 3));
    board.placePiece(friendly, new Vector2Int(4, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = king.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(4, 3))), "King should not capture friendly");
}

// Test 4: King can capture enemy
console.log("--- Test 4: King Can Capture Enemy ---");
{
    const board = new Board(8, 8);
    const king = new King(PlayerColor.White, new Vector2Int(3, 3));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(4, 3));
    board.placePiece(king, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(4, 3));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = king.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(4, 3)) && m.isCapture);
    assertTrue(captureMove !== undefined, "King should be able to capture enemy");
}

// Test 5: King value
console.log("--- Test 5: King Value ---");
{
    const king = new King(PlayerColor.White, new Vector2Int(0, 0));
    assertTrue(king.getValue() === 100000, "King should have very high value");
}

console.log("\n=== King Tests Complete ===");

