// src/renderer/chess/engineAdapter.ts
import { StandardChessMode } from "../../engine/modes/StandardChessMode";
import { GameState } from "../../engine/state/GameState";
import { GameEngine } from "../../engine/core/GameEngine";
import { HumanController } from "../../engine/controllers/HumanController";
import { GreedyAIController } from "../../engine/controllers/GreedyAIController";
import { StandardChessRuleSet } from "../../engine/rules/StandardChess";
import { Move } from "../../engine/primitives/Move";
import { PlayerColor } from "../../engine/primitives/PlayerColor";

// Import prototype extensions to add dispatch and runTurn methods to GameEngine
import "../../engine/core/EventPipeline";
import "../../engine/core/Turns";

/**
 * Small adapter to wire up engine + controllers for the UI.
 * Human plays White, AI plays Black.
 */
export type EngineBundle = {
    engine: GameEngine;
    getState: () => GameState;
    rules: StandardChessRuleSet;
    submitHumanMove: (move: Move) => void;
};

export function createEngineBundle(): EngineBundle {
    const mode = new StandardChessMode();
    const board = mode.setupBoard();
    const rules = mode.getRuleSet() as StandardChessRuleSet;

    // Human = White, AI = Black
    const human = new HumanController(rules);
    const ai = new GreedyAIController(rules, 3);

    const initialState = GameState.createInitial(board, PlayerColor.White);
    const engine = new GameEngine(initialState, human, ai, rules);

    const getState = () => engine.currentState;

    /**
     * Human submits a move → controller stores it → engine.runTurn() executes.
     * After human move, if game continues, AI move is processed after a delay.
     */
    const submitHumanMove = (move: Move) => {
        // tell the human controller what to play
        human.submitMove(move);

        // let the engine process White's turn
        (engine as any).runTurn();

        // Process AI move after a short delay to make it feel more natural
        if (!engine.isGameOver()) {
            (engine as any).runTurn();
        }
    };

    return { engine, getState, rules, submitHumanMove };
}
