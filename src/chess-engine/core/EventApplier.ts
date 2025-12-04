import { GameState } from "../state/GameState";
import {
    Event,
    MoveEvent,
    CaptureEvent,
    DestroyEvent,
    TurnAdvancedEvent,
    TurnStartEvent,
    TurnEndEvent,
    TileChangedEvent,
    PieceChangedEvent,
    TimeOutEvent,
    GameOverEvent,
} from "../events/EventRegistry";

/**
 * Applies a single event to a GameState, producing a new immutable GameState.
 * This is the core state mutation logic - each event type has specific behavior.
 * 
 * Note: This is a pure function - no side effects, returns new state.
 */
export class EventApplier {
    /**
     * Apply an event to the current state, returning a new state.
     * 
     * @param event - The event to apply
     * @param currentState - The current state
     * @returns New GameState after applying the event
     */
    static applyEvent(event: Event, currentState: GameState): GameState {
        const board = currentState.board.clone();
        let nextPlayer = currentState.currentPlayer;
        let turnNumber = currentState.turnNumber;

        if (event instanceof MoveEvent) {
            // Re-resolve from the cloned board, do not trust payload object identity
            const piece = board.getPieceAt(event.from);
            if (piece) {
                console.log(`[EventApplier] Moving piece ${piece.id} from ${event.from.toString()} to ${event.to.toString()}`);
                board.movePiece(event.from, event.to);
                piece.movesMade++;
            } else {
                console.log(`[EventApplier] WARNING: No piece found at ${event.from.toString()} for MoveEvent`);
            }
        } else if (event instanceof CaptureEvent) {
            const pos = event.target.position;
            const targetPiece = board.getPieceAt(pos);
            if (targetPiece) {
                console.log(`[EventApplier] Capturing piece ${targetPiece.id} at ${pos.toString()}`);
                board.removePiece(pos);
            } else {
                console.log(`[EventApplier] WARNING: No piece found at ${pos.toString()} for CaptureEvent`);
            }
        } else if (event instanceof DestroyEvent) {
            const pos = event.target.position;
            if (board.getPieceAt(pos)) {
                board.removePiece(pos);
            }
        } else if (event instanceof TurnAdvancedEvent) {
            nextPlayer = event.nextPlayer;
            turnNumber = event.turnNumber;
        } else if (event instanceof TileChangedEvent) {
            board.setTile(event.position, event.newTile.clone());
        } else if (event instanceof PieceChangedEvent) {
            board.removePiece(event.oldPiece.position);
            board.placePiece(event.newPiece, event.position);
        } else if (event instanceof TurnStartEvent) {
            // No board change - informational event
        } else if (event instanceof TurnEndEvent) {
            // No board change - informational event
        } else if (event instanceof TimeOutEvent) {
            // No board change - should be converted to GameOverEvent by listeners
        } else if (event instanceof GameOverEvent) {
            // No board change - game over is informational
        }

        return new GameState(board, nextPlayer, turnNumber, [...currentState.moveHistory]);
    }
}

