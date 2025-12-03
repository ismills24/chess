import { Piece } from "./Piece";

/**
 * Configuration for a player, including their pieces and money.
 * This is a data structure representing player configuration.
 */
export class Player {
    readonly pieces: Piece[];
    readonly money: number;

    constructor(
        pieces: Piece[],
        money: number = 0,
    ) {
        this.pieces = [...pieces]; // Create a copy to prevent external mutation
        this.money = money;
    }

    /**
     * Creates a copy of this player configuration.
     */
    clone(): Player {
        return new Player(
            this.pieces.map(p => p.clone()),
            this.money,
        );
    }

    /**
     * Gets the number of pieces in this configuration.
     */
    get pieceCount(): number {
        return this.pieces.length;
    }
}

