/**
 * Tests for CannibalAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/CannibalAbility.test.ts
 */

import { CannibalAbility } from "../CannibalAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Cannibal can only capture friendly pieces
console.log("--- Test 1: Cannibal Can Only Capture Friendly Pieces ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const cannibal = new CannibalAbility(basePawn);
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(1, 1));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    board.placePiece(cannibal, new Vector2Int(0, 0));
    board.placePiece(friendly, new Vector2Int(1, 1));
    board.placePiece(enemy, new Vector2Int(2, 2));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = cannibal.getCandidateMoves(state);
    // Should have capture move for friendly, but not for enemy
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(1, 1)) && m.isCapture), "Cannibal should be able to capture friendly");
    assertTrue(!moves.moves.some(m => m.to.equals(new Vector2Int(2, 2)) && m.isCapture), "Cannibal should not be able to capture enemy");
}

// Test 2: Cannibal can still move to empty squares
console.log("--- Test 2: Cannibal Can Still Move to Empty Squares ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const cannibal = new CannibalAbility(basePawn);
    board.placePiece(cannibal, new Vector2Int(0, 0));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = cannibal.getCandidateMoves(state);
    assertTrue(moves.moves.length > 0, "Cannibal should have regular moves");
}

console.log("\n=== CannibalAbility Tests Complete ===");

