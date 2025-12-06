import { Board } from "./Board";
import { PlayerColor } from "../primitives/PlayerColor";
import { GameState } from "./GameState";
import { Piece } from "./types";

const HASH_BITS = 64n;
const HASH_MASK = (1n << HASH_BITS) - 1n;

// Deterministic seed for reproducibility
let rngState = 0x9e3779b97f4a7c15n;
function nextRand64(): bigint {
    // xorshift*
    let x = rngState;
    x ^= x << 7n;
    x ^= x >> 9n;
    x ^= x << 8n;
    rngState = x & HASH_MASK;
    return rngState | 1n; // avoid zero
}

// Helper to get ability ids from a piece by unwrapping decorators
function getAbilityIds(piece: any): string[] {
    const ids: string[] = [];
    let cursor: any = piece;
    while (cursor && cursor.innerPiece) {
        ids.push(cursor.constructor.name);
        cursor = cursor.innerPiece;
    }
    return ids;
}

// Piece types are dynamic; we’ll key by constructor name
const pieceNameCache = new Map<Function, string>();
function pieceName(piece: Piece): string {
    const ctor = piece.constructor as Function;
    const cached = pieceNameCache.get(ctor);
    if (cached) return cached;
    const name = ctor.name || "Piece";
    pieceNameCache.set(ctor, name);
    return name;
}

// Tile types keyed by constructor name
const tileNameCache = new Map<Function, string>();
function tileName(tile: any): string {
    const ctor = tile.constructor as Function;
    const cached = tileNameCache.get(ctor);
    if (cached) return cached;
    const name = ctor.name || "Tile";
    tileNameCache.set(ctor, name);
    return name;
}

// We will lazily size tables by board area at runtime
let boardSizeForTables = 0;
let pieceTable: Record<string, bigint[]> = {};
let abilityTable: Record<string, bigint[]> = {};
let tileTable: Record<string, bigint[]> = {};
let sideToMoveKey = nextRand64();

function ensureTables(board: Board) {
    const area = board.width * board.height;
    if (area === boardSizeForTables) return;
    boardSizeForTables = area;
    // We don’t know the set of piece/tile/ability names upfront; we fill lazily.
    pieceTable = {};
    abilityTable = {};
    tileTable = {};
    sideToMoveKey = nextRand64();
}

function keyFor(
    table: Record<string, bigint[]>,
    name: string,
    index: number
): bigint {
    let arr = table[name];
    if (!arr) {
        arr = [];
        for (let i = 0; i < boardSizeForTables; i++) {
            arr.push(nextRand64());
        }
        table[name] = arr;
    }
    return arr[index];
}

export function hashBoard(board: Board, currentPlayer: PlayerColor): bigint {
    ensureTables(board);
    let h = 0n;

    // side to move
    if (currentPlayer === PlayerColor.White) {
        h ^= sideToMoveKey;
    }

    // pieces
    for (const piece of board.getAllPieces()) {
        const idx = piece.position.x + piece.position.y * board.width;
        const pName = pieceName(piece);
        h ^= keyFor(pieceTable, `${pName}:${piece.owner}`, idx);
        for (const ability of getAbilityIds(piece)) {
            h ^= keyFor(abilityTable, ability, idx);
        }
    }

    // tiles
    for (const tile of board.getAllTiles()) {
        const idx = tile.position.x + tile.position.y * board.width;
        const tName = tileName(tile);
        h ^= keyFor(tileTable, tName, idx);
    }

    return h & HASH_MASK;
}

export function hashState(state: GameState): bigint {
    return hashBoard(state.board, state.currentPlayer);
}

