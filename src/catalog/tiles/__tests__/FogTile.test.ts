import { describe, it, expect } from 'vitest';
import { FogTile } from "../FogTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { CaptureEvent } from "../../../chess-engine/events/EventRegistry";

describe('FogTile', () => {
    it('should prevent capture of occupying piece', () => {
        const board = new Board(8, 8);
        const protectedPiece = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const attacker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
        const fog = new FogTile(new Vector2Int(3, 3));
        board.placePiece(protectedPiece, new Vector2Int(3, 3));
        board.placePiece(attacker, new Vector2Int(4, 4));
        board.setTile(new Vector2Int(3, 3), fog);
        const state = new GameState(board, PlayerColor.Black, 1);

        const captureMove = new Move(new Vector2Int(4, 4), new Vector2Int(3, 3), attacker, true);
        const result = ChessEngine.resolveMove(state, captureMove);

        // Protected piece should survive
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.owner).toBe(PlayerColor.White);
        
        const captureEvents = result.eventLog.filter(e => e instanceof CaptureEvent);
        expect(captureEvents.length).toBe(0);
    });

    it('should restrict movement to occupied square', () => {
        const board = new Board(8, 8);
        const occupant = new Pawn(PlayerColor.White, new Vector2Int(3, 3));
        const mover = new Pawn(PlayerColor.Black, new Vector2Int(2, 2));
        const fog = new FogTile(new Vector2Int(3, 3));
        board.placePiece(occupant, new Vector2Int(3, 3));
        board.placePiece(mover, new Vector2Int(2, 2));
        board.setTile(new Vector2Int(3, 3), fog);
        const state = new GameState(board, PlayerColor.Black, 1);

        const restrictions = fog.getRestrictedSquares(state);
        expect(restrictions).not.toBeNull();
        expect(restrictions?.restrictedSquares.some(sq => sq.equals(new Vector2Int(3, 3)))).toBe(true);
    });
});

