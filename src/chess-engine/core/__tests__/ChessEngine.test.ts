/**
 * Tests for ChessEngine - main engine API
 * Run with: npx tsx src/chess-engine/core/__tests__/ChessEngine.test.ts
 */

import { ChessEngine } from "../ChessEngine";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { Listener } from "../../listeners";
import { GameEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent, MoveEvent, DestroyEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";
import { RuleSet } from "../../rules/RuleSet";

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

// Mock factories
function createMockPiece(id: string, owner: PlayerColor, pos: Vector2Int): Piece {
    return {
        id,
        name: "MockPiece",
        owner,
        position: pos,
        movesMade: 0,
        capturesMade: 0,
        clone() {
            return createMockPiece(this.id, this.owner, this.position);
        },
    };
}

function createMockTile(id: string, pos: Vector2Int): Tile {
    return {
        id,
        position: pos,
        clone() {
            return createMockTile(this.id, this.position);
        },
    };
}

// Mock RuleSet for testing
class MockRuleSet implements RuleSet {
    getLegalMoves(state: GameState, piece: Piece): Move[] {
        // Return a simple move for testing
        return [new Move(piece.position, new Vector2Int(piece.position.x + 1, piece.position.y), piece)];
    }

    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null } {
        return { over: false, winner: null };
    }
}

console.log("=== ChessEngine Tests ===\n");

// Setup: Create a simple board state
const board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
const piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
board.placePiece(piece1, new Vector2Int(1, 1));
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Test 1: resolveMove - basic move
console.log("--- Test 1: resolveMove - Basic Move ---");
const move = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1);
const result1 = ChessEngine.resolveMove(initialState, move, []);
assertTrue(result1.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Piece moved");
assertTrue(result1.eventLog.length >= 1, "Event log has events");
console.log();

// Test 2: resolveMove - with capture
console.log("--- Test 2: resolveMove - With Capture ---");
const piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(3, 3));
const boardWithEnemy = board.clone();
boardWithEnemy.placePiece(piece2, new Vector2Int(3, 3));
const stateWithEnemy = new GameState(boardWithEnemy, PlayerColor.White, 1, []);

const captureMove = new Move(new Vector2Int(1, 1), new Vector2Int(3, 3), piece1, true);
const result2 = ChessEngine.resolveMove(stateWithEnemy, captureMove, []);
assertTrue(result2.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Attacker at target");
assertTrue(result2.finalState.board.getPieceAt(new Vector2Int(1, 1)) === null, "Attacker left origin");
// Check that capture event is in log
const hasCaptureEvent = result2.eventLog.some(e => e.constructor.name === "CaptureEvent");
assertTrue(hasCaptureEvent, "Capture event in log");
console.log();

// Test 3: resolveEvent - single event
console.log("--- Test 3: resolveEvent - Single Event ---");
const turnStartEvent = new TurnStartEvent(PlayerColor.White, 1);
const result3 = ChessEngine.resolveEvent(initialState, turnStartEvent, []);
assertTrue(result3.eventLog.length === 1, "One event in log");
assertTrue(result3.eventLog[0] instanceof TurnStartEvent, "Correct event type");
console.log();

// Test 4: resolveTurn - full turn orchestration
console.log("--- Test 4: resolveTurn - Full Turn ---");
const result4 = ChessEngine.resolveTurn(initialState, move, []);
const eventTypes = result4.eventLog.map(e => e.constructor.name);
assertTrue(eventTypes.includes("TurnStartEvent"), "TurnStartEvent in log");
assertTrue(eventTypes.includes("MoveEvent"), "MoveEvent in log");
assertTrue(eventTypes.includes("TurnEndEvent"), "TurnEndEvent in log");
assertTrue(eventTypes.includes("TurnAdvancedEvent"), "TurnAdvancedEvent in log");
assertEquals(result4.finalState.currentPlayer, PlayerColor.Black, "Player switched");
assertEquals(result4.finalState.turnNumber, 2, "Turn incremented");
console.log();

// Test 5: resolveMove - with listeners
console.log("--- Test 5: resolveMove - With Listeners ---");
let listenerCalled = false;
const testListener: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        if (event instanceof MoveEvent) {
            listenerCalled = true;
        }
        return [];
    },
};

const result5 = ChessEngine.resolveMove(initialState, move, [testListener]);
assertTrue(listenerCalled, "Listener called");
console.log();

// Test 6: getLegalMoves
console.log("--- Test 6: getLegalMoves ---");
const ruleset = new MockRuleSet();
const legalMoves = ChessEngine.getLegalMoves(initialState, piece1, ruleset);
assertTrue(legalMoves.length > 0, "Legal moves returned");
assertTrue(legalMoves[0] instanceof Move, "Moves are Move instances");
console.log();

// Test 7: isGameOver
console.log("--- Test 7: isGameOver ---");
const gameOverResult = ChessEngine.isGameOver(initialState, ruleset);
assertTrue(typeof gameOverResult.over === "boolean", "Returns game over status");
assertTrue(gameOverResult.winner === null || gameOverResult.winner === PlayerColor.White || gameOverResult.winner === PlayerColor.Black, "Winner is valid");
console.log();

// Test 8: resolveTurn - listeners see turn events
console.log("--- Test 8: resolveTurn - Listeners See Turn Events ---");
const turnEventLog: string[] = [];
const turnListener: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        turnEventLog.push(event.constructor.name);
        return [];
    },
};

ChessEngine.resolveTurn(initialState, move, [turnListener]);
assertTrue(turnEventLog.includes("TurnStartEvent"), "Listener saw TurnStartEvent");
assertTrue(turnEventLog.includes("MoveEvent"), "Listener saw MoveEvent");
assertTrue(turnEventLog.includes("TurnEndEvent"), "Listener saw TurnEndEvent");
assertTrue(turnEventLog.includes("TurnAdvancedEvent"), "Listener saw TurnAdvancedEvent");
console.log();

// Test 9: State immutability across multiple resolves
console.log("--- Test 9: State Immutability ---");
const result9a = ChessEngine.resolveMove(initialState, move, []);
const result9b = ChessEngine.resolveMove(initialState, move, []);
assertTrue(initialState.board.getPieceAt(new Vector2Int(1, 1)) !== null, "Original state unchanged");
assertTrue(result9a.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "First resolve worked");
assertTrue(result9b.finalState.board.getPieceAt(new Vector2Int(3, 3)) !== null, "Second resolve worked");
console.log();

// Test 10: Chain reaction through resolveMove
console.log("--- Test 10: Chain Reaction ---");
const chainListener: Listener = {
    priority: 0,
    onAfterEvent(ctx, event) {
        if (event instanceof MoveEvent) {
            // Generate destroy event
            return [new DestroyEvent(event.piece, "Chain", event.actor, "chain")];
        }
        return [];
    },
};

const result10 = ChessEngine.resolveMove(initialState, move, [chainListener]);
assertTrue(result10.eventLog.length >= 2, "Chain reaction generated events");
const hasDestroy = result10.eventLog.some(e => e instanceof DestroyEvent);
assertTrue(hasDestroy, "Destroy event generated");
console.log();

console.log("=== All ChessEngine Tests Complete ===");
if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All tests passed!");
}

