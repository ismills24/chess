import { describe, it, expect } from 'vitest';
import { CannibalAbility } from "../CannibalAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { King } from "../../pieces/standard/King";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";

describe('CannibalAbility', () => {
    it('should only capture friendly pieces', () => {
        const board = new Board(8, 8);
        // Use a King which can move to adjacent squares including diagonals
        const baseKing = new King(PlayerColor.White, new Vector2Int(3, 3));
        const cannibal = new CannibalAbility(baseKing);
        const friendly = new Pawn(PlayerColor.White, new Vector2Int(4, 4));
        const enemy = new Pawn(PlayerColor.Black, new Vector2Int(4, 3));
        board.placePiece(cannibal, new Vector2Int(3, 3));
        board.placePiece(friendly, new Vector2Int(4, 4));
        board.placePiece(enemy, new Vector2Int(4, 3));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = cannibal.getCandidateMoves(state);
        // Should have capture move for friendly, but not for enemy
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 4)) && m.isCapture)).toBe(true);
        expect(moves.moves.some(m => m.to.equals(new Vector2Int(4, 3)) && m.isCapture)).toBe(false);
    });

    it('should still move to empty squares', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
        const cannibal = new CannibalAbility(basePawn);
        board.placePiece(cannibal, new Vector2Int(0, 0));
        const state = new GameState(board, PlayerColor.White, 1);

        const moves = cannibal.getCandidateMoves(state);
        expect(moves.moves.length).toBeGreaterThan(0);
    });
});

