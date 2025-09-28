/**
 * Immutable 2D integer vector, used for board coordinates.
 * (0,0) is the bottom-left of the board.
 */
export class Vector2Int {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2Int): Vector2Int {
        return new Vector2Int(this.x + other.x, this.y + other.y);
    }

    subtract(other: Vector2Int): Vector2Int {
        return new Vector2Int(this.x - other.x, this.y - other.y);
    }

    equals(other: Vector2Int): boolean {
        return this.x === other.x && this.y === other.y;
    }

    toString(): string {
        return `(${this.x},${this.y})`;
    }

    // Hash code is less critical in JS, but we can provide one
    get hashCode(): number {
        // simple hash mix
        return ((this.x & 0xffff) << 16) ^ (this.y & 0xffff);
    }
}
