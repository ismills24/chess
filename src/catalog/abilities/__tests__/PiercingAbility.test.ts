/**
 * Tests for PiercingAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/PiercingAbility.test.ts
 */

import { PiercingAbility } from "../PiercingAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { DestroyEvent, MoveEvent } from "../../../chess-engine/events/EventRegistry";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Piercing piece jumps over target and lands behind
console.log("--- Test 1: Piercing Piece Jumps Over Target and Lands Behind ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const piercing = new PiercingAbility(basePawn);
    const target = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    board.placePiece(piercing, new Vector2Int(2, 2));
    board.placePiece(target, new Vector2Int(4, 4));
    const state = new GameState(board, PlayerColor.White, 1);

    const captureMove = new Move(new Vector2Int(2, 2), new Vector2Int(4, 4), piercing, true);
    const result = ChessEngine.resolveMove(state, captureMove, [piercing]);

    // Piercing piece should land behind target, target should be destroyed
    const landingSquare = new Vector2Int(6, 6);
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4)) === null, "Target should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(landingSquare)?.id === piercing.id, "Piercing piece should land behind target");
    
    const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
    assertTrue(moveEvents.length >= 1, "Should have move event");
}

// Test 2: Piercing piece captures piece at landing square
console.log("--- Test 2: Piercing Piece Captures Piece at Landing Square ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const piercing = new PiercingAbility(basePawn);
    const target = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const landingPiece = new Pawn(PlayerColor.Black, new Vector2Int(6, 6));
    board.placePiece(piercing, new Vector2Int(2, 2));
    board.placePiece(target, new Vector2Int(4, 4));
    board.placePiece(landingPiece, new Vector2Int(6, 6));
    const state = new GameState(board, PlayerColor.White, 1);

    const captureMove = new Move(new Vector2Int(2, 2), new Vector2Int(4, 4), piercing, true);
    const result = ChessEngine.resolveMove(state, captureMove, [piercing]);

    // Both target and landing piece should be destroyed
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4)) === null, "Target should be destroyed");
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(6, 6))?.id === piercing.id, "Piercing piece should land at landing square");
    
    const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
    assertTrue(destroyEvents.length >= 1, "Should have destroy events");
}

console.log("\n=== PiercingAbility Tests Complete ===");

