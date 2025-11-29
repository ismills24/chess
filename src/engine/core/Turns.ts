// src/engine/core/Turns.ts
import { GameEngine } from "./GameEngine";
import { PlayerColor } from "../primitives/PlayerColor";
import { TurnStartEvent, TurnEndEvent, TurnAdvancedEvent } from "../events/GameEvent";
import { ActionPackages } from "./action-packages";
import { ProcessMove } from "./ProcessMove";
import { Move } from "../primitives/Move";

(GameEngine.prototype as any).runTurn = function runTurn() {
    const engine = this as GameEngine;

    if (engine.isGameOver()) return;

    const currentPlayer = engine.currentState.currentPlayer;
    const currentTurnNumber = engine.currentState.turnNumber;
    
    // Start tracking this turn
    (engine as any)._startTurnTracking();

    const controller =
        currentPlayer === PlayerColor.White
            ? (engine as any).whiteController
            : (engine as any).blackController;

    (engine as any).dispatch(
        ActionPackages.single(
            new TurnStartEvent(currentPlayer, currentTurnNumber)
        ),
        false
    );

    const move = controller.selectMove(engine.currentState);
    if (!move) {
        // Turn aborted, clear tracking
        (engine as any)._canonicalEventsThisTurn = [];
        return;
    }

    // Record the player's move intent before interceptors modify it
    (engine as any)._recordPlayerMoveIntent(move);

    // Build and dispatch the move package
    const pkg = ProcessMove.buildMoveSequence(move, engine.currentState);
    const completed = (engine as any).dispatch(pkg, false);
    if (!completed) {
        // Turn aborted, clear tracking
        (engine as any)._canonicalEventsThisTurn = [];
        return;
    }

    (engine as any).dispatch(
        ActionPackages.single(
            new TurnEndEvent(currentPlayer, currentTurnNumber)
        ),
        false
    );

    // Advance the turn
    const after = engine.currentState;
    const nextPlayer =
        after.currentPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
    const advance = ActionPackages.single(new TurnAdvancedEvent(nextPlayer, after.turnNumber + 1));
    (engine as any).dispatch(advance, false);
    
    // Finish tracking - use the state after turn advance for final state
    (engine as any)._finishTurnTracking(currentPlayer, currentTurnNumber);
};
