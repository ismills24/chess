// src/engine/core/Simulation.ts
import { GameEngine } from "./GameEngine";
import { Move } from "../primitives/Move";
import { GameState } from "../state/GameState";
import { RuleSet } from "../rules/RuleSet";
import { PlayerColor } from "../primitives/PlayerColor";
import { TurnAdvancedEvent } from "../events/GameEvent";
import { ActionPackages } from "./action-packages";
import { ProcessMove } from "./ProcessMove";

export class Simulation {
    /**
     * Simulate a full turn (move package + turn advance) without mutating canonical history.
     * Uses a temporary engine instance and Dispatch(simulation: true).
     */
    static simulateTurn(startingState: GameState, move: Move, ruleset: RuleSet): GameState {
        const dummy: any = new NullController();
        const clonedState = startingState.clone();
        const engine = new GameEngine(clonedState, dummy, dummy, ruleset);

        const pkg = ProcessMove.buildMoveSequence(move, engine.currentState);
        const completed = (engine as any).dispatch(pkg, true);
        if (!completed) return engine.currentState;

        const after = engine.currentState;
        const next =
            after.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
        const advance = ActionPackages.single(new TurnAdvancedEvent(next, after.turnNumber + 1));
        (engine as any).dispatch(advance, true);

        return engine.currentState;
    }
}

class NullController {
    selectMove(): Move | null {
        return null;
    }
}
