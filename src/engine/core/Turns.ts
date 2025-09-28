// src/engine/core/Turns.ts
import { GameEngine } from "./GameEngine";
import { PlayerColor } from "../primitives/PlayerColor";
import { TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/GameEvent";
import { ActionPackages } from "./action-packages";
import { ProcessMove } from "./ProcessMove";

(GameEngine.prototype as any).runTurn = function runTurn() {
    const engine = this as GameEngine;

    if (engine.isGameOver()) return;

    const controller =
        engine.currentState.currentPlayer === PlayerColor.White
            ? (engine as any).whiteController
            : (engine as any).blackController;

    (engine as any).dispatch(
        ActionPackages.single(
            new TurnStartEvent(engine.currentState.currentPlayer, engine.currentState.turnNumber)
        ),
        false
    );

    const move = controller.selectMove(engine.currentState);
    if (!move) return;

    // Build and dispatch the move package
    const pkg = ProcessMove.buildMoveSequence(move, engine.currentState);
    const completed = (engine as any).dispatch(pkg, false);
    if (!completed) return;

    (engine as any).dispatch(
        ActionPackages.single(
            new TurnEndEvent(engine.currentState.currentPlayer, engine.currentState.turnNumber)
        ),
        false
    );

    // Advance the turn
    const after = engine.currentState;
    const nextPlayer =
        after.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
    const advance = ActionPackages.single(new TurnAdvancedEvent(nextPlayer, after.turnNumber + 1));
    (engine as any).dispatch(advance, false);
};
