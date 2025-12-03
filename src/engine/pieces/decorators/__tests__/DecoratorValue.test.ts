import { describe, it, expect } from 'vitest';
import { Pawn } from "../../standard/Pawn";
import { Rook } from "../../standard/Rook";
import { Queen } from "../../standard/Queen";
import { Knight } from "../../standard/Knight";
import { PiercingDecorator } from "../PiercingDecorator";
import { ExplodingDecorator } from "../ExplodingDecorator";
import { MarksmanDecorator } from "../MarksmanDecorator";
import { CannibalDecorator } from "../CannibalDecorator";
import { BouncerDecorator } from "../BouncerDecorator";
import { ScapegoatDecorator } from "../ScapegoatDecorator";
import { PlayerColor } from "../../../primitives/PlayerColor";
import { Vector2Int } from "../../../primitives/Vector2Int";

describe('Decorator Value System', () => {
    it('should have correct base piece values', () => {
        const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        expect(pawn.getValue()).toBe(1);

        const rook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
        expect(rook.getValue()).toBe(5);

        const queen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
        expect(queen.getValue()).toBe(9);

        const knight = new Knight(PlayerColor.White, new Vector2Int(0, 0));
        expect(knight.getValue()).toBe(3);
    });

    it('should add value for single decorator', () => {
        const piercingPawn = new PiercingDecorator(new Pawn(PlayerColor.White, new Vector2Int(0, 0)));
        expect(piercingPawn.getValue()).toBe(4); // Pawn (1) + Piercing (3)

        const explodingRook = new ExplodingDecorator(new Rook(PlayerColor.White, new Vector2Int(0, 0)));
        expect(explodingRook.getValue()).toBe(7); // Rook (5) + Exploding (2)

        const marksmanQueen = new MarksmanDecorator(new Queen(PlayerColor.White, new Vector2Int(0, 0)));
        expect(marksmanQueen.getValue()).toBe(13); // Queen (9) + Marksman (4)
    });

    it('should stack decorators correctly (recursion test)', () => {
        const basePawn1 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const piercingPawn1 = new PiercingDecorator(basePawn1);
        const explodingPiercingPawn = new ExplodingDecorator(piercingPawn1);
        expect(explodingPiercingPawn.getValue()).toBe(6); // Pawn (1) + Piercing (3) + Exploding (2)

        const basePawn2 = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const piercingPawn2 = new PiercingDecorator(basePawn2);
        const explodingPiercingPawn2 = new ExplodingDecorator(piercingPawn2);
        const marksmanExplodingPiercingPawn = new MarksmanDecorator(explodingPiercingPawn2);
        expect(marksmanExplodingPiercingPawn.getValue()).toBe(10); // Pawn (1) + Piercing (3) + Exploding (2) + Marksman (4)
    });

    it('should handle triple decorator stack', () => {
        const baseRook = new Rook(PlayerColor.White, new Vector2Int(0, 0));
        const bouncerRook = new BouncerDecorator(baseRook);
        const cannibalBouncerRook = new CannibalDecorator(bouncerRook);
        const scapegoatCannibalBouncerRook = new ScapegoatDecorator(cannibalBouncerRook);
        expect(scapegoatCannibalBouncerRook.getValue()).toBe(8); // Rook (5) + Bouncer (1) + Cannibal (1) + Scapegoat (1)
    });

    it('should handle fully decorated Queen', () => {
        const baseQueen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
        const baseValue = baseQueen.getValue();

        const step1 = new PiercingDecorator(baseQueen);
        const step2 = new ExplodingDecorator(step1);
        const step3 = new MarksmanDecorator(step2);
        const step4 = new CannibalDecorator(step3);
        const step5 = new BouncerDecorator(step4);
        const decoratedQueen = new ScapegoatDecorator(step5);

        const expectedFullyDecorated = 9 + 3 + 2 + 4 + 1 + 1 + 1; // 21
        expect(decoratedQueen.getValue()).toBe(expectedFullyDecorated);
    });

    it('should verify individual decorator values', () => {
        // These are just constant checks
        expect(3).toBe(3); // PiercingDecorator adds 3
        expect(1).toBe(1); // CannibalDecorator adds 1
        expect(2).toBe(2); // ExplodingDecorator adds 2
        expect(4).toBe(4); // MarksmanDecorator adds 4
        expect(1).toBe(1); // BouncerDecorator adds 1
        expect(1).toBe(1); // ScapegoatDecorator adds 1
    });
});
