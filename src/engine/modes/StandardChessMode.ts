import { GameMode } from "./GameMode";
import { Board } from "../board/Board";
import { StandardChessPlacement } from "./placement/StandardChessPlacement";
import { PiecePlacement } from "./placement/PiecePlacement";
import { RuleSet } from "../rules/RuleSet";
import { StandardChessRuleSet } from "../rules/StandardChess";
import { PlayerColor } from "../primitives/PlayerColor";

/**
 * Standard chess game mode with traditional pieces and no special tiles.
 */
export class StandardChessMode implements GameMode {
    readonly name = "Standard Chess";
    readonly description = "Traditional chess with standard pieces and no special effects";

    getPiecePlacement(): PiecePlacement {
        return new StandardChessPlacement();
    }

    setupBoard(): Board {
        const board = new Board(8, 8);
        const placement = this.getPiecePlacement();
        placement.placePieces(board, PlayerColor.White);
        placement.placePieces(board, PlayerColor.Black);
        return board;
    }

    getRuleSet(): RuleSet {
        return new StandardChessRuleSet();
    }
}
