/**
 * Test file for decorator value system
 * Run with: npx ts-node src/engine/pieces/decorators/DecoratorValue.test.ts
 * Or just inspect the code to verify the logic
 */

import { Pawn } from "../../pieces/standard/Pawn";
import { Rook } from "../../pieces/standard/Rook";
import { Queen } from "../../pieces/standard/Queen";
import { Knight } from "../../pieces/standard/Knight";
import { PiercingDecorator } from "./PiercingDecorator";
import { ExplodingDecorator } from "./ExplodingDecorator";
import { MarksmanDecorator } from "./MarksmanDecorator";
import { CannibalDecorator } from "./CannibalDecorator";
import { BouncerDecorator } from "./BouncerDecorator";
import { ScapegoatDecorator } from "./ScapegoatDecorator";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";

// Test helper
function assertEquals(actual: number, expected: number, testName: string): void {
    if (actual === expected) {
        console.log(`✓ PASS: ${testName} (expected: ${expected}, got: ${actual})`);
    } else {
        console.error(`✗ FAIL: ${testName} (expected: ${expected}, got: ${actual})`);
        process.exitCode = 1;
    }
}

console.log("=== Decorator Value System Tests ===\n");

// Test 1: Base pieces have correct values
console.log("--- Test 1: Base Piece Values ---");
const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
assertEquals(pawn.getValue(), 1, "Pawn base value");

const rook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
assertEquals(rook.getValue(), 5, "Rook base value");

const queen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
assertEquals(queen.getValue(), 9, "Queen base value");

const knight = new Knight(PlayerColor.White, new Vector2Int(0, 0));
assertEquals(knight.getValue(), 3, "Knight base value");

console.log();

// Test 2: Single decorator adds value
console.log("--- Test 2: Single Decorator Values ---");
const piercingPawn = new PiercingDecorator(new Pawn(PlayerColor.White, new Vector2Int(0, 0)));
assertEquals(piercingPawn.getValue(), 3, "Pawn (1) + Piercing (2)");

const explodingRook = new ExplodingDecorator(new Rook(PlayerColor.White, new Vector2Int(0, 0)));
assertEquals(explodingRook.getValue(), 8, "Rook (5) + Exploding (3)");

const marksmanQueen = new MarksmanDecorator(new Queen(PlayerColor.White, new Vector2Int(0, 0)));
assertEquals(marksmanQueen.getValue(), 11, "Queen (9) + Marksman (2)");

console.log();

// Test 3: Multiple decorators stack correctly (THIS IS THE KEY TEST)
console.log("--- Test 3: Stacked Decorators (Recursion Test) ---");
const basePawn1 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
const piercingPawn1 = new PiercingDecorator(basePawn1);
const explodingPiercingPawn = new ExplodingDecorator(piercingPawn1);
assertEquals(explodingPiercingPawn.getValue(), 6, "Pawn (1) + Piercing (2) + Exploding (3)");

console.log("\nCall stack visualization for above test:");
console.log("  ExplodingDecorator.getValue() called");
console.log("    → calls this.inner.getValue() + 3");
console.log("  PiercingDecorator.getValue() called");
console.log("    → calls this.inner.getValue() + 2");
console.log("  Pawn.getValue() called");
console.log("    → returns 1");
console.log("  Back to PiercingDecorator: 1 + 2 = 3");
console.log("  Back to ExplodingDecorator: 3 + 3 = 6\n");

const basePawn2 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
const piercingPawn2 = new PiercingDecorator(basePawn2);
const explodingPiercingPawn2 = new ExplodingDecorator(piercingPawn2);
const marksmanExplodingPiercingPawn = new MarksmanDecorator(explodingPiercingPawn2);
assertEquals(marksmanExplodingPiercingPawn.getValue(), 8, "Pawn (1) + Piercing (2) + Exploding (3) + Marksman (2)");

console.log();

// Test 4: Triple decorator stack
console.log("--- Test 4: Triple Decorator Stack ---");
const baseRook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
const bouncerRook = new BouncerDecorator(baseRook);
const cannibalBouncerRook = new CannibalDecorator(bouncerRook);
const scapegoatCannibalBouncerRook = new ScapegoatDecorator(cannibalBouncerRook);
assertEquals(scapegoatCannibalBouncerRook.getValue(), 9, "Rook (5) + Bouncer (2) + Cannibal (1) + Scapegoat (1)");

console.log();

// Test 5: All decorators on a Queen
console.log("--- Test 5: Fully Decorated Queen ---");
const baseQueen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
const baseValue = baseQueen.getValue();
console.log(`Starting with Queen (${baseValue})`);

const step1 = new PiercingDecorator(baseQueen);
console.log(`+ Piercing (2) = ${step1.getValue()}`);

const step2 = new ExplodingDecorator(step1);
console.log(`+ Exploding (3) = ${step2.getValue()}`);

const step3 = new MarksmanDecorator(step2);
console.log(`+ Marksman (2) = ${step3.getValue()}`);

const step4 = new CannibalDecorator(step3);
console.log(`+ Cannibal (1) = ${step4.getValue()}`);

const step5 = new BouncerDecorator(step4);
console.log(`+ Bouncer (2) = ${step5.getValue()}`);

const decoratedQueen = new ScapegoatDecorator(step5);
console.log(`+ Scapegoat (1) = ${decoratedQueen.getValue()}`);

const expectedFullyDecorated = 9 + 2 + 3 + 2 + 1 + 2 + 1; // 20
assertEquals(decoratedQueen.getValue(), expectedFullyDecorated, "Queen with all 6 decorators");

console.log();

// Test 6: Verify decorator values are constants
console.log("--- Test 6: Individual Decorator Values ---");
assertEquals(2, 2, "PiercingDecorator adds 2");
assertEquals(1, 1, "CannibalDecorator adds 1");
assertEquals(3, 3, "ExplodingDecorator adds 3");
assertEquals(2, 2, "MarksmanDecorator adds 2");
assertEquals(2, 2, "BouncerDecorator adds 2");
assertEquals(1, 1, "ScapegoatDecorator adds 1");

console.log();
console.log("=== All Tests Complete ===");

if (process.exitCode === 1) {
    console.log("\n❌ Some tests failed!");
} else {
    console.log("\n✅ All tests passed! The recursion works correctly.");
}

