import { PlayerController } from "./PlayerController";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { RuleSet } from "../rules/RuleSet";

export class HumanController implements PlayerController {
    private pendingMove: Move | null = null;
    private rules: RuleSet;

    constructor(rules: RuleSet) {
        this.rules = rules;
    }

    submitMove(move: Move) {
        this.pendingMove = move;
    }

    selectMove(_state: GameState): Move | null {
        if (!this.pendingMove) return null;
        const move = this.pendingMove;
        this.pendingMove = null;
        return move;
    }
}
