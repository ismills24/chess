import { describe, it, expect, beforeEach } from 'vitest';
import { EventApplier } from "../EventApplier";
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import {
    MoveEvent,
    CaptureEvent,
    DestroyEvent,
    TurnAdvancedEvent,
    TileChangedEvent,
    PieceChangedEvent,
} from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";

// Mock piece and tile factories
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

describe('EventApplier', () => {
    let board: Board;
    let piece1: Piece;
    let piece2: Piece;
    let initialState: GameState;

    beforeEach(() => {
        board = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        piece1 = createMockPiece("piece1", PlayerColor.White, new Vector2Int(1, 1));
        piece2 = createMockPiece("piece2", PlayerColor.Black, new Vector2Int(2, 2));
        board.placePiece(piece1, new Vector2Int(1, 1));
        board.placePiece(piece2, new Vector2Int(2, 2));
        initialState = new GameState(board, PlayerColor.White, 1, []);
    });

    it('should apply MoveEvent', () => {
        const moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(3, 3),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const result = EventApplier.applyEvent(moveEvent, initialState);
        expect(result.board.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(result.board.getPieceAt(new Vector2Int(1, 1))).toBeNull();
        const movedPiece = result.board.getPieceAt(new Vector2Int(3, 3));
        expect(movedPiece).not.toBeNull();
        expect(movedPiece?.movesMade).toBe(1);
    });

    it('should apply CaptureEvent', () => {
        const captureEvent = new CaptureEvent(piece1, piece2, PlayerColor.White, true);
        const result = EventApplier.applyEvent(captureEvent, initialState);
        expect(result.board.getPieceAt(new Vector2Int(2, 2))).toBeNull();
    });

    it('should apply DestroyEvent', () => {
        const destroyEvent = new DestroyEvent(piece2, "Test destruction", PlayerColor.White, "source");
        const result = EventApplier.applyEvent(destroyEvent, initialState);
        expect(result.board.getPieceAt(new Vector2Int(2, 2))).toBeNull();
    });

    it('should apply TurnAdvancedEvent', () => {
        const turnAdvancedEvent = new TurnAdvancedEvent(PlayerColor.Black, 2);
        const result = EventApplier.applyEvent(turnAdvancedEvent, initialState);
        expect(result.currentPlayer).toBe(PlayerColor.Black);
        expect(result.turnNumber).toBe(2);
    });

    it('should apply TileChangedEvent', () => {
        const newTile = createMockTile("newTile", new Vector2Int(4, 4));
        const tileChangedEvent = new TileChangedEvent(new Vector2Int(4, 4), newTile, PlayerColor.White);
        const result = EventApplier.applyEvent(tileChangedEvent, initialState);
        const changedTile = result.board.getTile(new Vector2Int(4, 4));
        expect(changedTile.id).toBe("newTile");
    });

    it('should apply PieceChangedEvent', () => {
        const newPiece = createMockPiece("newPiece", PlayerColor.White, new Vector2Int(1, 1));
        const pieceChangedEvent = new PieceChangedEvent(
            piece1,
            newPiece,
            new Vector2Int(1, 1),
            PlayerColor.White,
            "source"
        );
        const result = EventApplier.applyEvent(pieceChangedEvent, initialState);
        const transformedPiece = result.board.getPieceAt(new Vector2Int(1, 1));
        expect(transformedPiece).not.toBeNull();
        expect(transformedPiece?.id).toBe("newPiece");
    });

    it('should maintain state immutability', () => {
        const originalPiece = initialState.board.getPieceAt(new Vector2Int(1, 1));
        const testMove = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(5, 5),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const newState = EventApplier.applyEvent(testMove, initialState);
        expect(initialState.board.getPieceAt(new Vector2Int(1, 1))).not.toBeNull();
        expect(newState.board.getPieceAt(new Vector2Int(5, 5))).not.toBeNull();
    });
});
