import { Vector2Int } from "../primitives/Vector2Int";
import { PlayerColor } from "../primitives/PlayerColor";
import { Piece } from "../pieces/Piece";
import { Tile } from "../tiles/Tile";
import { StandardTile } from "../tiles/StandardTile";

/**
 * A 2D grid of tiles + pieces.
 * Provides spatial queries and mutation methods.
 */
export class Board {
    public pieces: (Piece | null)[][];
    public tiles: Tile[][];

    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.pieces = Array.from({ length: width }, () => Array(height).fill(null));
        this.tiles = Array.from({ length: width }, () =>
            Array.from({ length: height }, () => new StandardTile())
        );

        // assign default positions to tiles
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.tiles[x][y].position = new Vector2Int(x, y);
            }
        }
    }

    getPieceAt(pos: Vector2Int): Piece | null {
        return this.isInBounds(pos) ? this.pieces[pos.x][pos.y] : null;
    }

    placePiece(piece: Piece, pos: Vector2Int): void {
        if (!this.isInBounds(pos)) return;
        this.pieces[pos.x][pos.y] = piece;
        piece.position = pos;
    }

    removePiece(pos: Vector2Int): void {
        if (!this.isInBounds(pos)) return;
        this.pieces[pos.x][pos.y] = null;
    }

    movePiece(from: Vector2Int, to: Vector2Int): void {
        if (!this.isInBounds(from) || !this.isInBounds(to)) return;
        const piece = this.pieces[from.x][from.y];
        if (!piece) return;

        this.pieces[from.x][from.y] = null;
        this.pieces[to.x][to.y] = piece;
        piece.position = to;
    }

    getTile(pos: Vector2Int): Tile {
        return this.isInBounds(pos) ? this.tiles[pos.x][pos.y] : new StandardTile();
    }

    setTile(pos: Vector2Int, tile: Tile): void {
        if (!this.isInBounds(pos)) return;
        tile.position = pos;
        this.tiles[pos.x][pos.y] = tile;
    }

    setTileAt(x: number, y: number, tile: Tile): void {
        this.setTile(new Vector2Int(x, y), tile);
    }

    setTilesRect(topLeft: Vector2Int, bottomRight: Vector2Int, tile: Tile): void {
        for (let x = topLeft.x; x <= bottomRight.x; x++) {
            for (let y = topLeft.y; y <= bottomRight.y; y++) {
                this.setTileAt(x, y, tile.clone());
            }
        }
    }

    setTilesList(tilePositions: Array<{ pos: Vector2Int; tile: Tile }>): void {
        for (const { pos, tile } of tilePositions) {
            this.setTile(pos, tile.clone());
        }
    }

    getAllPieces(owner?: PlayerColor): Piece[] {
        const results: Piece[] = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const piece = this.pieces[x][y];
                if (piece && (!owner || piece.owner === owner)) {
                    results.push(piece);
                }
            }
        }
        return results;
    }

    getAllTiles(): Tile[] {
        const results: Tile[] = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                results.push(this.tiles[x][y]);
            }
        }
        return results;
    }

    isInBounds(pos: Vector2Int): boolean {
        return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
    }

    clone(): Board {
        const clone = new Board(this.width, this.height);

        // clone pieces
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const piece = this.pieces[x][y];
                if (piece) clone.pieces[x][y] = piece.clone();
            }
        }

        // clone tiles
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                clone.tiles[x][y] = this.tiles[x][y].clone();
            }
        }

        return clone;
    }
}
