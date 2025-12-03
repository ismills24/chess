import { describe, it, expect } from 'vitest';
import { PiercingAbility } from "../PiercingAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { DestroyEvent, MoveEvent } from "../../../chess-engine/events/EventRegistry";

describe('PiercingAbility', () => {
    it('should jump over target and land behind', () => {
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
        expect(result.finalState.board.getPieceAt(new Vector2Int(4, 4))).toBeNull();
        expect(result.finalState.board.getPieceAt(landingSquare)?.id).toBe(piercing.id);
        
        const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
        expect(moveEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture piece at landing square', () => {
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
        expect(result.finalState.board.getPieceAt(new Vector2Int(4, 4))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(6, 6))?.id).toBe(piercing.id);
        
        const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
        expect(destroyEvents.length).toBeGreaterThanOrEqual(1);
    });
});

