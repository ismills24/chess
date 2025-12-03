/**
 * DEMONSTRATION: Decorator Value System
 * 
 * This file demonstrates how decorator values stack through recursion.
 * You can import this in any part of the codebase to see the values in action.
 */

import { Pawn } from "../../pieces/standard/Pawn";
import { Rook } from "../../pieces/standard/Rook";
import { PiercingDecorator } from "./PiercingDecorator";
import { ExplodingDecorator } from "./ExplodingDecorator";
import { MarksmanDecorator } from "./MarksmanDecorator";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";

/**
 * Demonstrates decorator value recursion with detailed logging
 */
export function demonstrateDecoratorValues(): void {
    console.log("\n=== DECORATOR VALUE SYSTEM DEMONSTRATION ===\n");

    // Example 1: Single decorator
    console.log("Example 1: Single Decorator");
    console.log("----------------------------");
    const pawn1 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    console.log(`Base Pawn value: ${pawn1.getValue()}`);
    
    const piercingPawn = new PiercingDecorator(pawn1);
    console.log(`Piercing Pawn value: ${piercingPawn.getValue()}`);
    console.log(`Calculation: ${pawn1.getValue()} (pawn) + 2 (piercing) = ${piercingPawn.getValue()}\n`);

    // Example 2: Two decorators (demonstrates recursion)
    console.log("Example 2: Two Decorators (Recursion!)");
    console.log("---------------------------------------");
    const pawn2 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
    const piercingPawn2 = new PiercingDecorator(pawn2);
    const explodingPiercingPawn = new ExplodingDecorator(piercingPawn2);
    
    console.log(`Base Pawn value: ${pawn2.getValue()}`);
    console.log(`Piercing Pawn value: ${piercingPawn2.getValue()}`);
    console.log(`Exploding Piercing Pawn value: ${explodingPiercingPawn.getValue()}`);
    console.log("\nRecursion visualization:");
    console.log("  explodingPiercingPawn.getValue()");
    console.log("    → ExplodingDecorator: this.inner.getValue() + 3");
    console.log("    → PiercingDecorator: this.inner.getValue() + 2");
    console.log("    → Pawn: returns 1");
    console.log("    → Back up: 1 + 2 = 3");
    console.log("    → Back up: 3 + 3 = 6");
    console.log(`  Final result: ${explodingPiercingPawn.getValue()}\n`);

    // Example 3: Three decorators
    console.log("Example 3: Three Decorators");
    console.log("---------------------------");
    const rook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
    const piercingRook = new PiercingDecorator(rook);
    const explodingPiercingRook = new ExplodingDecorator(piercingRook);
    const marksmanExplodingPiercingRook = new MarksmanDecorator(explodingPiercingRook);
    
    console.log(`Rook: ${rook.getValue()}`);
    console.log(`+ Piercing: ${piercingRook.getValue()}`);
    console.log(`+ Exploding: ${explodingPiercingRook.getValue()}`);
    console.log(`+ Marksman: ${marksmanExplodingPiercingRook.getValue()}`);
    console.log(`\nCalculation: 5 + 2 + 3 + 2 = ${marksmanExplodingPiercingRook.getValue()}\n`);

    console.log("=== END DEMONSTRATION ===\n");
}

// Uncomment to run when this file is imported
// demonstrateDecoratorValues();

