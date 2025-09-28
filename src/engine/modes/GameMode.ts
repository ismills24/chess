import { Board } from "../board/Board";
import { RuleSet } from "../rules/RuleSet";
import { PiecePlacement } from "./placement/PiecePlacement";

/**
 * Interface for different game modes (Standard Chess, Random Chess, etc.)
 */
export interface GameMode {
    readonly name: string;
    readonly description: string;

    /**
     * Piece placement configuration for this game mode.
     */
    getPiecePlacement(): PiecePlacement;

    /**
     * Set up the initial board with pieces and tiles.
     */
    setupBoard(): Board;

    /**
     * Ruleset for this game mode.
     */
    getRuleSet(): RuleSet;
}
