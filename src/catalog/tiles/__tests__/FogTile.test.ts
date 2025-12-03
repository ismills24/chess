/**
 * Tests for FogTile
 * Run with: npx tsx src/catalog/tiles/__tests__/FogTile.test.ts
 */

import { FogTile } from "../FogTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { CaptureEvent } from "../../../chess-engine/events/EventRegistry";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: FogTile prevents capture of occupying piece
console.log("--- Test 1: FogTile Prevents Capture of Occupying Piece ---");
{
    const board = new Board(8, 8);
    const protectedPiece = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const attacker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const fog = new FogTile(new Vector2Int(3, 3));
    board.placePiece(protectedPiece, new Vector2Int(3, 3));
    board.placePiece(attacker, new Vector2Int(4, 4));
    board.setTile(new Vector2Int(3, 3), fog);
    const state = new GameState(board, PlayerColor.Black, 1);

    const captureMove = new Move(new Vector2Int(4, 4), new Vector2Int(3, 3), attacker, true);
    const result = ChessEngine.resolveMove(state, captureMove, [fog]);

    // Protected piece should survive
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner === PlayerColor.White, "Protected piece should survive");
    
    const captureEvents = result.eventLog.filter(e => e instanceof CaptureEvent);
    assertTrue(captureEvents.length === 0, "Should not have capture event");
}

// Test 2: FogTile restricts movement to occupied square
console.log("--- Test 2: FogTile Restricts Movement to Occupied Square ---");
{
    const board = new Board(8, 8);
    const occupant = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const mover = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
    const fog = new FogTile(new Vector2Int(3, 3));
    board.placePiece(occupant, new Vector2Int(3, 3));
    board.placePiece(mover, new Vector2Int(2, 2));
    board.setTile(new Vector2Int(3, 3), fog);
    const state = new GameState(board, PlayerColor.Black, 1);

    const restrictions = fog.getRestrictedSquares(state);
    assertTrue(restrictions !== null, "Should have movement restrictions");
    assertTrue(restrictions.restrictedSquares.some(sq => sq.equals(new Vector2Int(3, 3))), "Should restrict fog tile square");
}

console.log("\n=== FogTile Tests Complete ===");

