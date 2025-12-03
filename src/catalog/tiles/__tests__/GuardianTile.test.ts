/**
 * Tests for GuardianTile
 * Run with: npx tsx src/catalog/tiles/__tests__/GuardianTile.test.ts
 */

import { GuardianTile } from "../GuardianTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { CaptureEvent, TileChangedEvent } from "../../../chess-engine/events/EventRegistry";
import { StandardTile } from "../StandardTile";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: GuardianTile cancels capture and consumes itself
console.log("--- Test 1: GuardianTile Cancels Capture and Consumes Itself ---");
{
    const board = new Board(8, 8);
    const protectedPiece = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const attacker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const guardian = new GuardianTile(new Vector2Int(3, 3));
    board.placePiece(protectedPiece, new Vector2Int(3, 3));
    board.placePiece(attacker, new Vector2Int(4, 4));
    board.setTile(new Vector2Int(3, 3), guardian);
    const state = new GameState(board, PlayerColor.Black, 1);

    const captureMove = new Move(new Vector2Int(4, 4), new Vector2Int(3, 3), attacker, true);
    const result = ChessEngine.resolveMove(state, captureMove, [guardian]);

    // Protected piece should survive, guardian should be consumed
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner === PlayerColor.White, "Protected piece should survive");
    const tile = result.finalState.board.getTile(new Vector2Int(3, 3));
    assertTrue(tile instanceof StandardTile, "Guardian tile should be consumed");
    
    const tileChangeEvent = result.eventLog.find(e => e instanceof TileChangedEvent);
    assertTrue(tileChangeEvent !== undefined, "Should have TileChangedEvent");
}

// Test 2: GuardianTile cancels move to occupied square
console.log("--- Test 2: GuardianTile Cancels Move to Occupied Square ---");
{
    const board = new Board(8, 8);
    const occupant = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const mover = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    const guardian = new GuardianTile(new Vector2Int(3, 3));
    board.placePiece(occupant, new Vector2Int(3, 3));
    board.placePiece(mover, new Vector2Int(2, 2));
    board.setTile(new Vector2Int(3, 3), guardian);
    const state = new GameState(board, PlayerColor.Black, 1);

    const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), mover);
    const result = ChessEngine.resolveMove(state, move, [guardian]);

    // Move should be cancelled, guardian consumed
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(2, 2))?.id === mover.id, "Mover should not move");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner === PlayerColor.White, "Occupant should remain");
    const tile = result.finalState.board.getTile(new Vector2Int(3, 3));
    assertTrue(tile instanceof StandardTile, "Guardian tile should be consumed");
}

console.log("\n=== GuardianTile Tests Complete ===");

