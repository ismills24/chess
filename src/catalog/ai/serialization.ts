import { GameState } from "../../chess-engine/state/GameState";
import { Board } from "../../chess-engine/state/Board";
import { Move } from "../../chess-engine/primitives/Move";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Piece as EnginePiece, Tile as EngineTile } from "../../chess-engine/state/types";
import { Piece as CatalogPiece } from "../pieces/Piece";
import { Tile as CatalogTile } from "../tiles/Tile";
import {
    PieceId,
    AbilityId,
    TileId,
    abilityIdsForPiece,
    tileIdForInstance,
    createPiece,
    applyAbility,
    createTile,
} from "../registry/Catalog";

/**
 * Serializable representation of a GameState for web worker communication.
 * Contains all data needed to reconstruct the state in the worker.
 */
export interface SerializedGameState {
    board: SerializedBoard;
    currentPlayer: PlayerColor;
    turnNumber: number;
    moveHistory: SerializedMove[];
}

export interface SerializedBoard {
    width: number;
    height: number;
    pieces: (SerializedPiece | null)[][];
    tiles: SerializedTile[][];
}

export interface SerializedPiece {
    pieceId: PieceId;
    owner: PlayerColor;
    position: { x: number; y: number };
    movesMade: number;
    capturesMade: number;
    /**
     * For decorated pieces, store the ability chain.
     * The order here MUST match the order expected by applyAbility.
     * (Typically outermost → innermost, but this depends on Catalog implementation.)
     */
    abilityIds?: AbilityId[];
}

export interface SerializedTile {
    tileId: TileId;
    position: { x: number; y: number };
    tileInstanceId?: string;
}

/**
 * NOTE: For worker negamax, we only really need from/to/isCapture.
 * The `piece` field is primarily for reconstructing move history if needed.
 */
export interface SerializedMove {
    from: { x: number; y: number };
    to: { x: number; y: number };
    piece: SerializedPiece;
    isCapture: boolean;
}

/**
 * Serialize a GameState to a plain object for web worker communication.
 */
export function serializeGameState(state: GameState): SerializedGameState {
    return {
        board: serializeBoard(state.board),
        currentPlayer: state.currentPlayer,
        turnNumber: state.turnNumber,
        moveHistory: state.moveHistory.map(serializeMove),
    };
}

function serializeBoard(board: Board): SerializedBoard {
    const pieces: (SerializedPiece | null)[][] = [];
    const tiles: SerializedTile[][] = [];

    for (let x = 0; x < board.width; x++) {
        pieces[x] = [];
        tiles[x] = [];
        for (let y = 0; y < board.height; y++) {
            const piece = board.pieces[x][y];
            pieces[x][y] = piece ? serializePiece(piece) : null;
            tiles[x][y] = serializeTile(board.tiles[x][y]);
        }
    }

    return {
        width: board.width,
        height: board.height,
        pieces,
        tiles,
    };
}

function serializePiece(piece: EnginePiece): SerializedPiece {
    // Extract piece type from name (e.g., "Pawn", "King", etc.)
    // Piece names are like "Pawn", "King", "Marksman Pawn", etc.
    const pieceName = piece.name;
    let pieceId: PieceId = "Pawn"; // sensible default

    if (pieceName.includes("Pawn")) pieceId = "Pawn";
    else if (pieceName.includes("Knight")) pieceId = "Knight";
    else if (pieceName.includes("Bishop")) pieceId = "Bishop";
    else if (pieceName.includes("Rook")) pieceId = "Rook";
    else if (pieceName.includes("Queen")) pieceId = "Queen";
    else if (pieceName.includes("King")) pieceId = "King";

    // All catalog pieces implement full interface
    const abilityIds = abilityIdsForPiece(piece as unknown as CatalogPiece);

    return {
        pieceId,
        owner: piece.owner,
        position: { x: piece.position.x, y: piece.position.y },
        movesMade: piece.movesMade,
        capturesMade: piece.capturesMade,
        abilityIds: abilityIds.length > 0 ? abilityIds : undefined,
    };
}

function serializeTile(tile: EngineTile): SerializedTile {
    // Cast to CatalogTile since all tiles in the catalog implement the full interface
    return {
        tileId: tileIdForInstance(tile as unknown as CatalogTile),
        position: { x: tile.position.x, y: tile.position.y },
        tileInstanceId: tile.id,
    };
}

export function serializeMove(move: Move): SerializedMove {
    return {
        from: { x: move.from.x, y: move.from.y },
        to: { x: move.to.x, y: move.to.y },
        piece: serializePiece(move.piece),
        isCapture: move.isCapture,
    };
}

/**
 * Deserialize a SerializedGameState back to a GameState.
 * Uses Catalog to reconstruct pieces and tiles.
 */
export function deserializeGameState(serialized: SerializedGameState): GameState {
    const board = deserializeBoard(serialized.board);

    // In LastPieceStanding, moveHistory is mostly cosmetic (no en passant / castling).
    // We still reconstruct it for completeness.
    const moveHistory = serialized.moveHistory.map(deserializeMove);

    return new GameState(board, serialized.currentPlayer, serialized.turnNumber, moveHistory);
}

function deserializeBoard(serialized: SerializedBoard): Board {
    const board = new Board(serialized.width, serialized.height);

    for (let x = 0; x < serialized.width; x++) {
        for (let y = 0; y < serialized.height; y++) {
            const pieceData = serialized.pieces[x][y];
            if (pieceData) {
                const piece = deserializePiece(pieceData);
                board.placePiece(piece, new Vector2Int(x, y));
            }

            const tileData = serialized.tiles[x][y];
            const tile = deserializeTile(tileData);
            board.setTile(new Vector2Int(x, y), tile);
        }
    }

    return board;
}

function deserializePiece(data: SerializedPiece): CatalogPiece {
    let piece = createPiece(
        data.pieceId,
        data.owner,
        new Vector2Int(data.position.x, data.position.y)
    );
    piece.movesMade = data.movesMade;
    piece.capturesMade = data.capturesMade;

    // Apply abilities in order. This assumes abilityIdsForPiece + applyAbility
    // agree on order (e.g., outermost → innermost).
    if (data.abilityIds) {
        for (const abilityId of data.abilityIds) {
            piece = applyAbility(abilityId, piece);
        }
    }

    return piece;
}

function deserializeTile(data: SerializedTile): CatalogTile {
    return createTile(
        data.tileId,
        new Vector2Int(data.position.x, data.position.y),
        data.tileInstanceId
    );
}

function deserializeMove(data: SerializedMove): Move {
    return new Move(
        new Vector2Int(data.from.x, data.from.y),
        new Vector2Int(data.to.x, data.to.y),
        deserializePiece(data.piece),
        data.isCapture
    );
}

/**
 * Lightweight move data used by the worker, which pulls the piece from the board.
 */
export function deserializeMoveData(data: SerializedMove): {
    from: Vector2Int;
    to: Vector2Int;
    isCapture: boolean;
} {
    return {
        from: new Vector2Int(data.from.x, data.from.y),
        to: new Vector2Int(data.to.x, data.to.y),
        isCapture: data.isCapture,
    };
}
