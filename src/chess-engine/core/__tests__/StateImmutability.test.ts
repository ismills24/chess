import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from "../../state/GameState";
import { Board } from "../../state/Board";
import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { EventApplier } from "../EventApplier";
import { MoveEvent, CaptureEvent } from "../../events/EventRegistry";
import { Piece, Tile } from "../../state/types";

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

describe('StateImmutability', () => {
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

    it('should create new board instance on clone', () => {
        const clonedBoard = initialState.board.clone();
        expect(clonedBoard).not.toBe(initialState.board);
        expect(clonedBoard.width).toBe(initialState.board.width);
    });

    it('should maintain cloned board independence', () => {
        const clonedBoard = initialState.board.clone();
        const piece3 = createMockPiece("piece3", PlayerColor.White, new Vector2Int(3, 3));
        clonedBoard.placePiece(piece3, new Vector2Int(3, 3));
        expect(clonedBoard.getPieceAt(new Vector2Int(3, 3))).not.toBeNull();
        expect(initialState.board.getPieceAt(new Vector2Int(3, 3))).toBeNull();
    });

    it('should create new state instance on clone', () => {
        const clonedState = initialState.clone();
        expect(clonedState).not.toBe(initialState);
        expect(clonedState.currentPlayer).toBe(initialState.currentPlayer);
    });

    it('should maintain cloned state independence', () => {
        const clonedState = initialState.clone();
        const newBoard = clonedState.board.clone();
        const piece4 = createMockPiece("piece4", PlayerColor.Black, new Vector2Int(4, 4));
        newBoard.placePiece(piece4, new Vector2Int(4, 4));
        const modifiedState = new GameState(newBoard, PlayerColor.Black, 2, []);
        expect(modifiedState.board.getPieceAt(new Vector2Int(4, 4))).not.toBeNull();
        expect(initialState.board.getPieceAt(new Vector2Int(4, 4))).toBeNull();
    });

    it('should not mutate original state when applying events', () => {
        const moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(5, 5),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const originalPiece = initialState.board.getPieceAt(new Vector2Int(1, 1));
        const newState = EventApplier.applyEvent(moveEvent, initialState);
        expect(initialState.board.getPieceAt(new Vector2Int(1, 1))).not.toBeNull();
        expect(newState.board.getPieceAt(new Vector2Int(5, 5))).not.toBeNull();
        expect(originalPiece).not.toBeNull();
        expect(originalPiece?.movesMade).toBe(0);
        const movedPiece = newState.board.getPieceAt(new Vector2Int(5, 5));
        expect(movedPiece).not.toBeNull();
        expect(movedPiece?.movesMade).toBe(1);
    });

    it('should maintain nested object immutability', () => {
        const moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(5, 5),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const newState = EventApplier.applyEvent(moveEvent, initialState);
        const originalPieces = initialState.board.getAllPieces();
        const afterMovePieces = newState.board.getAllPieces();
        expect(originalPieces).not.toBe(afterMovePieces);
        expect(originalPieces.length).toBe(afterMovePieces.length);
        // Verify pieces themselves are different objects
        const originalPiece1 = originalPieces.find(p => p.id === "piece1");
        const newPiece1 = afterMovePieces.find(p => p.id === "piece1");
        expect(originalPiece1).not.toBe(newPiece1);
    });

    it('should maintain immutability across multiple event applications', () => {
        const moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(5, 5),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const newState = EventApplier.applyEvent(moveEvent, initialState);
        // Get piece1 from the new state at its new position for the capture event
        const movedPiece1 = newState.board.getPieceAt(new Vector2Int(5, 5));
        if (!movedPiece1) {
            throw new Error("Piece1 should be at (5,5) after move");
        }
        const captureEvent = new CaptureEvent(movedPiece1, piece2, PlayerColor.White, true);
        const stateAfterCapture = EventApplier.applyEvent(captureEvent, newState);
        expect(initialState.board.getPieceAt(new Vector2Int(2, 2))).not.toBeNull();
        expect(newState.board.getPieceAt(new Vector2Int(2, 2))).not.toBeNull();
        expect(stateAfterCapture.board.getPieceAt(new Vector2Int(2, 2))).toBeNull();
    });

    it('should maintain move history immutability', () => {
        const stateWithHistory = initialState.withUpdatedState({ turnNumber: 2 });
        expect(initialState.turnNumber).toBe(1);
        expect(stateWithHistory.turnNumber).toBe(2);
        expect(initialState.moveHistory).not.toBe(stateWithHistory.moveHistory);
    });

    it('should maintain piece position immutability', () => {
        const moveEvent = new MoveEvent(
            new Vector2Int(1, 1),
            new Vector2Int(5, 5),
            piece1,
            PlayerColor.White,
            true,
            piece1.id
        );
        const newState = EventApplier.applyEvent(moveEvent, initialState);
        const originalPosition = piece1.position;
        const pieceAtNewPos = newState.board.getPieceAt(new Vector2Int(5, 5));
        expect(originalPosition.equals(new Vector2Int(1, 1))).toBe(true);
        expect(pieceAtNewPos).not.toBeNull();
        expect(pieceAtNewPos?.position.equals(new Vector2Int(5, 5))).toBe(true);
        expect(originalPosition).not.toBe(pieceAtNewPos?.position);
    });

    it('should deep clone board with multiple pieces', () => {
        const multiPieceBoard = new Board(8, 8, () => createMockTile("tile", new Vector2Int(0, 0)));
        for (let i = 0; i < 5; i++) {
            const p = createMockPiece(`piece${i}`, PlayerColor.White, new Vector2Int(i, i));
            multiPieceBoard.placePiece(p, new Vector2Int(i, i));
        }
        const multiPieceState = new GameState(multiPieceBoard, PlayerColor.White, 1, []);
        const clonedMultiState = multiPieceState.clone();
        expect(multiPieceState.board.getAllPieces().length).toBe(clonedMultiState.board.getAllPieces().length);
        // Verify all pieces are different instances
        const originalPieces2 = multiPieceState.board.getAllPieces();
        const clonedPieces2 = clonedMultiState.board.getAllPieces();
        for (let i = 0; i < originalPieces2.length; i++) {
            expect(originalPieces2[i]).not.toBe(clonedPieces2[i]);
        }
    });
});
