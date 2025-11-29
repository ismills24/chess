import { Piece } from "./Piece";

/**
 * Configuration for a player, including their pieces, time budget, and power-up.
 * This is a data structure representing player configuration.
 */
export class Player {
    readonly pieces: Piece[];
    readonly timeLeft: number; // Time in milliseconds (matching GameClock's timeBudgetMs type)

    constructor(
        pieces: Piece[],
        timeLeft: number,
    ) {
        this.pieces = [...pieces]; // Create a copy to prevent external mutation
        this.timeLeft = timeLeft;
    }

    /**
     * Creates a copy of this player configuration.
     */
    clone(): Player {
        return new Player(
            this.pieces.map(p => p.clone()),
            this.timeLeft,
        );
    }

    /**
     * Gets the number of pieces in this configuration.
     */
    get pieceCount(): number {
        return this.pieces.length;
    }
}

