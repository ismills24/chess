import { PlayerController } from "./PlayerController";
import { GameState } from "../state/GameState";
import { Move } from "../primitives/Move";
import { RuleSet } from "../rules/RuleSet";

/**
 * Human controller that picks a move.
 * Currently just selects the first available legal move as a placeholder.
 * In a real app, this would integrate with the UI.
 */
export class HumanController implements PlayerController {
    private readonly ruleset: RuleSet;
    private pendingMove: Move | null = null;

    constructor(ruleset: RuleSet) {
        this.ruleset = ruleset;
    }

    submitMove(move: Move) {
        this.pendingMove = move;
    }

    selectMove(_state: GameState): Move | null {
        const m = this.pendingMove;
        this.pendingMove = null;
        return m;
    }
}

