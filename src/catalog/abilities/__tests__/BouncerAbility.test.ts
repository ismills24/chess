/**
 * Tests for BouncerAbility
 * Run with: npx tsx src/catalog/abilities/__tests__/BouncerAbility.test.ts
 */

import { BouncerAbility } from "../BouncerAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { MoveEvent, DestroyEvent } from "../../../chess-engine/events/EventRegistry";

// Test helpers
function assertTrue(condition: boolean, testName: string): void {
    if (condition) {
        console.log(`✓ PASS: ${testName}`);
    } else {
        console.error(`✗ FAIL: ${testName}`);
        process.exitCode = 1;
    }
}

// Test 1: Bouncer bounces captured piece backward
console.log("--- Test 1: Bouncer Bounces Captured Piece Backward ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const bouncer = new BouncerAbility(basePawn);
    const target = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    board.placePiece(bouncer, new Vector2Int(2, 2));
    board.placePiece(target, new Vector2Int(4, 4));
    const state = new GameState(board, PlayerColor.White, 1);

    const captureMove = new Move(new Vector2Int(2, 2), new Vector2Int(4, 4), bouncer, true);
    const result = ChessEngine.resolveMove(state, captureMove, [bouncer]);

    // Target should be bounced backward, bouncer should move to target's position
    const bounceSquare = new Vector2Int(6, 6);
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(4, 4))?.id === bouncer.id, "Bouncer should move to target position");
    assertTrue(result.finalState.board.getPieceAt(bounceSquare)?.owner === PlayerColor.Black, "Target should be bounced backward");
    
    const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
    assertTrue(moveEvents.length >= 2, "Should have multiple move events");
}

// Test 2: Bouncer destroys piece at bounce square if enemy
console.log("--- Test 2: Bouncer Destroys Piece at Bounce Square if Enemy ---");
{
    const board = new Board(8, 8);
    const basePawn = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
    const bouncer = new BouncerAbility(basePawn);
    const target = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
    const bouncePiece = new Pawn(PlayerColor.Black, new Vector2Int(6, 6));
    board.placePiece(bouncer, new Vector2Int(2, 2));
    board.placePiece(target, new Vector2Int(4, 4));
    board.placePiece(bouncePiece, new Vector2Int(6, 6));
    const state = new GameState(board, PlayerColor.White, 1);

    const captureMove = new Move(new Vector2Int(2, 2), new Vector2Int(4, 4), bouncer, true);
    const result = ChessEngine.resolveMove(state, captureMove, [bouncer]);

    // Bounce piece should be destroyed
    assertTrue(result.finalState.board.getPieceAt(new Vector2Int(6, 6))?.owner === PlayerColor.Black, "Target should be bounced to bounce square");
    
    const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
    assertTrue(destroyEvents.length >= 1, "Should have destroy event for bounce piece");
}

console.log("\n=== BouncerAbility Tests Complete ===");

