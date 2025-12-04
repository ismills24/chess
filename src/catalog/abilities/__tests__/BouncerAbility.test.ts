import { describe, it, expect } from 'vitest';
import { BouncerAbility } from "../BouncerAbility";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { MoveEvent, DestroyEvent } from "../../../chess-engine/events/EventRegistry";

describe('BouncerAbility', () => {
    it('should bounce captured piece backward', () => {
        const board = new Board(8, 8);
        const basePawn = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
        const bouncer = new BouncerAbility(basePawn);
        const target = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
        board.placePiece(bouncer, new Vector2Int(2, 2));
        board.placePiece(target, new Vector2Int(4, 4));
        const state = new GameState(board, PlayerColor.White, 1);

        const captureMove = new Move(new Vector2Int(2, 2), new Vector2Int(4, 4), bouncer, true);
        const result = ChessEngine.resolveMove(state, captureMove);

        // Target should be bounced backward, bouncer should move to target's position
        const bounceSquare = new Vector2Int(6, 6);
        expect(result.finalState.board.getPieceAt(new Vector2Int(4, 4))?.id).toBe(bouncer.id);
        expect(result.finalState.board.getPieceAt(bounceSquare)?.owner).toBe(PlayerColor.Black);
        
        const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
        expect(moveEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('should destroy piece at bounce square if enemy', () => {
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
        const result = ChessEngine.resolveMove(state, captureMove);

        // Bounce piece should be destroyed
        expect(result.finalState.board.getPieceAt(new Vector2Int(6, 6))?.owner).toBe(PlayerColor.Black);
        
        const destroyEvents = result.eventLog.filter(e => e instanceof DestroyEvent);
        expect(destroyEvents.length).toBeGreaterThanOrEqual(1);
    });
});

