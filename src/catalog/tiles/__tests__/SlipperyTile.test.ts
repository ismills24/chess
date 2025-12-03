/**
 * Tests for SlipperyTile
 * Run with: npx tsx src/catalog/tiles/__tests__/SlipperyTile.test.ts
 */

import { SlipperyTile } from "../SlipperyTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { MoveEvent } from "../../../chess-engine/events/EventRegistry";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: SlipperyTile forces piece to slide one extra step
console.log("--- Test 1: SlipperyTile Forces Piece to Slide One Extra Step ---");
{
    const board = new Board(8, 8);
    const piece = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const slippery = new SlipperyTile(new Vector2Int(3, 3));
    board.placePiece(piece, new Vector2Int(2, 2));
    board.setTile(new Vector2Int(3, 3), slippery);
    const state = new GameState(board, PlayerColor.White, 1);

    const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), piece);
    const result = ChessEngine.resolveMove(state, move, [slippery]);

    // Piece should slide to (4, 4) instead of stopping at (3, 3)
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Piece should not stop at slippery tile");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4))?.id === piece.id, "Piece should slide to (4, 4)");
    
    const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
    assertTrue(moveEvents.length >= 2, "Should have multiple move events (initial + slide)");
}

// Test 2: SlipperyTile does not slide if next square is blocked
console.log("--- Test 2: SlipperyTile Does Not Slide If Next Square Is Blocked ---");
{
    const board = new Board(8, 8);
    const piece = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const blocker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const slippery = new SlipperyTile(new Vector2Int(3, 3));
    board.placePiece(piece, new Vector2Int(2, 2));
    board.placePiece(blocker, new Vector2Int(4, 4));
    board.setTile(new Vector2Int(3, 3), slippery);
    const state = new GameState(board, PlayerColor.White, 1);

    const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), piece);
    const result = ChessEngine.resolveMove(state, move, [slippery]);

    // Piece should stop at slippery tile if next square is blocked
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.id === piece.id, "Piece should stop at slippery tile");
}

console.log("\n=== SlipperyTile Tests Complete ===");

