/**
 * Tests for Pawn piece
 * Run with: npx tsx src/catalog/pieces/standard/__tests__/Pawn.test.ts
 */

import { Pawn } from "../Pawn";
import { PlayerColor } from "../../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../../chess-engine/state/GameState";
import { Board } from "../../../../chess-engine/state/Board";
import { ChessEngine } from "../../../../chess-engine/core/ChessEngine";
import { Move } from "../../../../chess-engine/primitives/Move";
import { Queen } from "../Queen";
import { PieceChangedEvent } from "../../../../chess-engine/events/EventRegistry";

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

// Test 1: Pawn forward movement
console.log("--- Test 1: Pawn Forward Movement ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
    board.placePiece(pawn, new Vector2Int(1, 1));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = pawn.getCandidateMoves(state);
    assertTrue(moves.moves.length >= 1, "Pawn should have forward move");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(1, 2))), "Pawn should be able to move forward 1");
}

// Test 2: Pawn double move from start rank
console.log("--- Test 2: Pawn Double Move from Start Rank ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
    board.placePiece(pawn, new Vector2Int(1, 1));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = pawn.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(1, 3))), "Pawn should be able to move forward 2 from start rank");
}

// Test 3: Pawn diagonal capture
console.log("--- Test 3: Pawn Diagonal Capture ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    board.placePiece(pawn, new Vector2Int(1, 1));
    board.placePiece(enemy, new Vector2Int(2, 2));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = pawn.getCandidateMoves(state);
    const captureMove = moves.moves.find(m => m.to.equals(new Vector2Int(2, 2)) && m.isCapture);
    assertTrue(captureMove !== undefined, "Pawn should be able to capture diagonally");
}

// Test 4: Pawn auto-promotion on last rank
console.log("--- Test 4: Pawn Auto-Promotion on Last Rank ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 6));
    board.placePiece(pawn, new Vector2Int(0, 6));
    const state = new GameState(board, PlayerColor.White, 1);

    const move = new Move(new Vector2Int(0, 6), new Vector2Int(0, 7), pawn);
    const result = ChessEngine.resolveMove(state, move, [pawn]);

    // Check that pawn was promoted to queen
    const pieceAtEnd = result.finalState.board.getPieceAt(new Vector2Int(0, 7));
    assertTrue(pieceAtEnd instanceof Queen, "Pawn should be promoted to Queen");
    assertTrue(pieceAtEnd.owner === PlayerColor.White, "Promoted piece should be white");
    
    // Check that promotion event was generated
    const promotionEvent = result.eventLog.find(e => e instanceof PieceChangedEvent);
    assertTrue(promotionEvent !== undefined, "Should have PieceChangedEvent for promotion");
}

// Test 5: Black pawn moves in opposite direction
console.log("--- Test 5: Black Pawn Moves in Opposite Direction ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.Black, new Vector2Int(1, 6));
    board.placePiece(pawn, new Vector2Int(1, 6));
    const state = new GameState(board, PlayerColor.Black, 1);

    const moves = pawn.getCandidateMoves(state);
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(1, 5))), "Black pawn should move down (negative Y)");
}

// Test 6: Pawn cannot move forward if blocked
console.log("--- Test 6: Pawn Cannot Move Forward if Blocked ---");
{
    const board = new Board(8, 8);
    const pawn = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
    const blocker = new Pawn(PlayerColor.White, new Vector2Int(1, 2));
    board.placePiece(pawn, new Vector2Int(1, 1));
    board.placePiece(blocker, new Vector2Int(1, 2));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = pawn.getCandidateMoves(state);
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(1, 2))), "Pawn should not be able to move to blocked square");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(1, 3))), "Pawn should not be able to move through blocker");
}

console.log("\n=== Pawn Tests Complete ===");

