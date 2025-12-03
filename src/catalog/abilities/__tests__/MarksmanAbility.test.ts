/**
 * Tests for MarksmanAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/MarksmanAbility.test.ts
 */

import { MarksmanAbility } from "../MarksmanAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { CaptureEvent, DestroyEvent } from "../../../chess-engine/events/EventRegistry";
import { Listener } from "../../../chess-engine/listeners";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Marksman converts capture to ranged destroy
console.log("--- Test 1: Marksman Converts Capture to Ranged Destroy ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const marksman = new MarksmanAbility(basePawn);
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
    board.placePiece(marksman, new Vector2Int(0, 0));
    board.placePiece(enemy, new Vector2Int(5, 5));
    const state = new GameState(board, PlayerColor.White, 1);

    const captureMove = new Move(new Vector2Int(0, 0), new Vector2Int(5, 5), marksman, true);
    const result = ChessEngine.resolveMove(state, captureMove, [marksman]);

    // Should have destroy event instead of capture
    const destroyEvent = result.eventLog.find(e => e instanceof DestroyEvent);
    assertTrue(destroyEvent !== undefined, "Should have DestroyEvent for ranged attack");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(5, 5)) === null, "Enemy should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(0, 0))?.id === marksman.id, "Marksman should not move");
}

// Test 2: Marksman consumes charges
console.log("--- Test 2: Marksman Consumes Charges ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const marksman = new MarksmanAbility(basePawn, undefined, 2); // 2 charges
    const enemy1 = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
    const enemy2 = new Pawn(PlayerColor.Black, new Vector2Int(6, 6));
    board.placePiece(marksman, new Vector2Int(0, 0));
    board.placePiece(enemy1, new Vector2Int(5, 5));
    board.placePiece(enemy2, new Vector2Int(6, 6));
    const state = new GameState(board, PlayerColor.White, 1);

    // First ranged attack
    const move1 = new Move(new Vector2Int(0, 0), new Vector2Int(5, 5), marksman, true);
    const result1 = ChessEngine.resolveMove(state, move1, [marksman]);
    assertTrue(result1.eventLog.some(e => e instanceof DestroyEvent), "First attack should work");

    // Second ranged attack (should still work with 1 charge left)
    const state2 = result1.finalState;
    const marksman2 = state2.board.getPieceAt(new Vector2Int(0, 0))!;
    // Get listeners from the new state (the marksman piece itself is a listener)
    const listeners2: Listener[] = [];
    for (const piece of state2.board.getAllPieces()) {
        if ('priority' in piece && typeof (piece as any).onBeforeEvent === 'function') {
            listeners2.push(piece as Listener);
        }
    }
    const move2 = new Move(new Vector2Int(0, 0), new Vector2Int(6, 6), marksman2, true);
    const result2 = ChessEngine.resolveMove(state2, move2, listeners2);
    assertTrue(result2.eventLog.some(e => e instanceof DestroyEvent), "Second attack should work");
}

// Test 3: Marksman adds ranged capture to candidate moves
console.log("--- Test 3: Marksman Adds Ranged Capture to Candidate Moves ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const marksman = new MarksmanAbility(basePawn);
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(1, 1));
    board.placePiece(marksman, new Vector2Int(0, 0));
    board.placePiece(enemy, new Vector2Int(1, 1));
    const state = new GameState(board, PlayerColor.White, 1);

    const moves = marksman.getCandidateMoves(state);
    // Should have both regular move and ranged capture option
    assertTrue(moves.moves.length >= 2, "Should have multiple move options");
    assertTrue(moves.moves.some(m => m.to.equals(new Vector2Int(1, 1)) && m.isCapture), "Should have ranged capture option");
}

console.log("\n=== MarksmanAbility Tests Complete ===");

