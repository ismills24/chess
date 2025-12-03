/**
 * Tests for ScapegoatAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/ScapegoatAbility.test.ts
 */

import { ScapegoatAbility } from "../ScapegoatAbility";
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

// Test 1: Scapegoat sacrifices itself to protect adjacent friendly
console.log("--- Test 1: Scapegoat Sacrifices Itself to Protect Adjacent Friendly ---");
{
    const board = new Board(8, 8);
    const basePawn1 = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
    const scapegoat = new ScapegoatAbility(basePawn1);
    const basePawn2 = new Pawn(PlayerColor.White, new Vector2Int(4, 4));
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(4, 4));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(5, 5));
    board.placePiece(scapegoat, new Vector2Int(3, 3));
    board.placePiece(friendly, new Vector2Int(4, 4));
    board.placePiece(enemy, new Vector2Int(5, 5));
    const state = new GameState(board, PlayerColor.Black, 1);

    const captureMove = new Move(new Vector2Int(5, 5), new Vector2Int(4, 4), enemy, true);
    const result = ChessEngine.resolveMove(state, captureMove, [scapegoat]);

    // Scapegoat should be destroyed, friendly should survive
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(3, 3)) === null, "Scapegoat should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4))?.owner === PlayerColor.White, "Friendly should survive");
    
    const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
    assertTrue(destroyEvents.length >= 1, "Should have destroy event for scapegoat");
}

// Test 2: Scapegoat does not protect non-adjacent friendly
console.log("--- Test 2: Scapegoat Does Not Protect Non-Adjacent Friendly ---");
{
    const board = new Board(8, 8);
    const basePawn1 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const scapegoat = new ScapegoatAbility(basePawn1);
    const friendly = new Pawn(PlayerColor.White, new Vector2Int(5, 5));
    const enemy = new Pawn(PlayerColor.Black, new Vector2Int(6, 6));
    board.placePiece(scapegoat, new Vector2Int(0, 0));
    board.placePiece(friendly, new Vector2Int(5, 5));
    board.placePiece(enemy, new Vector2Int(6, 6));
    const state = new GameState(board, PlayerColor.Black, 1);

    const captureMove = new Move(new Vector2Int(6, 6), new Vector2Int(5, 5), enemy, true);
    const result = ChessEngine.resolveMove(state, captureMove, [scapegoat]);

    // Scapegoat should not be destroyed (not adjacent)
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(0, 0))?.id === scapegoat.id, "Scapegoat should not be destroyed");
    // After capture, the attacker moves to (5,5), so check that the friendly is gone (not that square is empty)
    const pieceAt55 = result.finalState.board.getPieceAt(new Vector2Int(5, 5));
    assertTrue(pieceAt55 === null || pieceAt55.owner === PlayerColor.Black, "Friendly should be captured (square should be empty or have attacker)");
    // Verify friendly is actually gone by checking it's not at its original position with White owner
    const allWhitePieces = result.finalState.board.getAllPieces(PlayerColor.White);
    const friendlyStillExists = allWhitePieces.some(p => p.id === friendly.id);
    assertTrue(!friendlyStillExists, "Friendly piece should be removed from board");
}

console.log("\n=== ScapegoatAbility Tests Complete ===");

