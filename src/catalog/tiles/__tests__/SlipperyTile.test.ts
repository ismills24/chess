import { describe, it, expect } from 'vitest';
import { SlipperyTile } from "../SlipperyTile";
import { Pawn } from "../../pieces/standard/Pawn";
import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { Board } from "../../../chess-engine/state/Board";
import { ChessEngine } from "../../../chess-engine/core/ChessEngine";
import { Move } from "../../../chess-engine/primitives/Move";
import { MoveEvent } from "../../../chess-engine/events/EventRegistry";

describe('SlipperyTile', () => {
    it('should force piece to slide one extra step', () => {
        const board = new Board(8, 8);
        const piece = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
        const slippery = new SlipperyTile(new Vector2Int(3, 3));
        board.placePiece(piece, new Vector2Int(2, 2));
        board.setTile(new Vector2Int(3, 3), slippery);
        const state = new GameState(board, PlayerColor.White, 1);

        const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), piece);
        const result = ChessEngine.resolveMove(state, move, [slippery]);

        // Piece should slide to (4, 4) instead of stopping at (3, 3)
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))).toBeNull();
        expect(result.finalState.board.getPieceAt(new Vector2Int(4, 4))?.id).toBe(piece.id);
        
        const moveEvents = result.eventLog.filter(e => e instanceof MoveEvent);
        expect(moveEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('should not slide if next square is blocked', () => {
        const board = new Board(8, 8);
        const piece = new Pawn(PlayerColor.White, new Vector2Int(2, 2));
        const blocker = new Pawn(PlayerColor.Black, new Vector2Int(4, 4));
        const slippery = new SlipperyTile(new Vector2Int(3, 3));
        board.placePiece(piece, new Vector2Int(2, 2));
        board.placePiece(blocker, new Vector2Int(4, 4));
        board.setTile(new Vector2Int(3, 3), slippery);
        const state = new GameState(board, PlayerColor.White, 1);

        const move = new Move(new Vector2Int(2, 2), new Vector2Int(3, 3), piece);
        const result = ChessEngine.resolveMove(state, move, [slippery]);

        // Piece should stop at slippery tile if next square is blocked
        expect(result.finalState.board.getPieceAt(new Vector2Int(3, 3))?.id).toBe(piece.id);
    });
});

