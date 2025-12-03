/**
 * Tests for ExplodingAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/ExplodingAbility.test.ts
 */

import { ExplodingAbility } from "../ExplodingAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { CaptureEvent, DestroyEvent } from "../../../chess-engine/events/EventRegistry";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Exploding piece destroys adjacent pieces when captured
console.log("--- Test 1: Exploding Piece Destroys Adjacent Pieces When Captured ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const exploding = new ExplodingAbility(basePawn);
    const enemy1 = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    const enemy2 = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(3, 4));
    board.placePiece(exploding, new Vector2Int(3, 3));
    board.placePiece(enemy1, new Vector2Int(2, 2));
    board.placePiece(enemy2, new Vector2Int(4, 4));
    board.placePiece(friendly, new Vector2Int(3, 4));
    const state = new GameState(board, PlayerColor.Black, 1);

    // Create a piece at (4,3) to capture from
    const capturer = new Pawn(PlayerColor.Black, new Vector2Int(4, 3));
    board.placePiece(capturer, new Vector2Int(4, 3));
    const state2 = new GameState(board, PlayerColor.Black, 1);
    
    const captureMove = new Move(new Vector2Int(4, 3), new Vector2Int(3, 3), capturer, true);
    const result = ChessEngine.resolveMove(state2, captureMove, [exploding]);

    // Exploding piece and adjacent pieces should be destroyed
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Exploding piece should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(2, 2)) === null, "Adjacent enemy should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4)) === null, "Capturing piece should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 4)) === null, "Adjacent friendly should be destroyed");
    
    const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
    assertTrue(destroyEvents.length >= 3, "Should have multiple destroy events");
}

// Test 2: Exploding piece destroys adjacent pieces when destroyed
console.log("--- Test 2: Exploding Piece Destroys Adjacent Pieces When Destroyed ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const exploding = new ExplodingAbility(basePawn);
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    board.placePiece(exploding, new Vector2Int(3, 3));
    board.placePiece(enemy, new Vector2Int(2, 2));
    const state = new GameState(board, PlayerColor.Black, 1);

    const destroyEvent = new DestroyEvent(exploding, "Test destroy", PlayerColor.Black);
    const result = ChessEngine.resolveMove(state, new Move(new Vector2Int(0, 0), new Vector2Int(0, 0), enemy), [exploding]);
    // Actually need to trigger destroy event directly
    const destroyResult = ChessEngine.resolveEvent(state, destroyEvent, [exploding]);

    assertTrue(destroyResult.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Exploding piece should be destroyed");
    assertTrue(destroyResult.finalState.board.getPieceAt(new Vector2Int(2, 2)) === null, "Adjacent piece should be destroyed");
}

console.log("\n=== ExplodingAbility Tests Complete ===");

