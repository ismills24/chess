// src/renderer/chess/chessManagerAdapter.ts
import { ChessManager } from "../../chess-manager/ChessManager";
import { GameState } from "../../chess-engine/state/GameState";
import { Board } from "../../chess-engine/state/Board";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { RuleSet } from "../../chess-engine/rules/RuleSet";
import { LastPieceStandingRuleSet } from "../../catalog/rulesets/LastPieceStanding";
import { GreedyAI } from "../../catalog/ai/GreedyAI";
import { createPiece, createTile } from "../../catalog/registry/Catalog";
import { PieceId } from "../../catalog/registry/Catalog";

/**
 * Small adapter to wire up ChessManager + Catalog for the UI.
 * Human plays White, AI plays Black.
 * 
 * This adapter uses the new modular architecture:
 * - ChessManager: Match orchestration
 * - Catalog: Content definitions (pieces, tiles, rulesets)
 * - Never directly uses chess-engine (only through ChessManager)
 */
export type ChessManagerBundle = {
    manager: ChessManager;
    getState: () => GameState;
    rules: RuleSet;
    submitHumanMove: (move: Move) => void;
    undo: () => void;
    redo: () => void;
};

/**
 * Create a standard chess board using Catalog pieces.
 */
function createStandardChessBoard(): Board {
    // Board constructor will set tile positions automatically
    const board = new Board(8, 8, () => createTile("StandardTile"));

    // Place White pieces (bottom rank)
    const whiteMainRank = 0;
    const whitePawnRank = 1;
    
    board.placePiece(createPiece("Rook", PlayerColor.White, new Vector2Int(0, whiteMainRank)), new Vector2Int(0, whiteMainRank));
    board.placePiece(createPiece("Knight", PlayerColor.White, new Vector2Int(1, whiteMainRank)), new Vector2Int(1, whiteMainRank));
    board.placePiece(createPiece("Bishop", PlayerColor.White, new Vector2Int(2, whiteMainRank)), new Vector2Int(2, whiteMainRank));
    board.placePiece(createPiece("Queen", PlayerColor.White, new Vector2Int(3, whiteMainRank)), new Vector2Int(3, whiteMainRank));
    board.placePiece(createPiece("King", PlayerColor.White, new Vector2Int(4, whiteMainRank)), new Vector2Int(4, whiteMainRank));
    board.placePiece(createPiece("Bishop", PlayerColor.White, new Vector2Int(5, whiteMainRank)), new Vector2Int(5, whiteMainRank));
    board.placePiece(createPiece("Knight", PlayerColor.White, new Vector2Int(6, whiteMainRank)), new Vector2Int(6, whiteMainRank));
    board.placePiece(createPiece("Rook", PlayerColor.White, new Vector2Int(7, whiteMainRank)), new Vector2Int(7, whiteMainRank));
    
    for (let x = 0; x < 8; x++) {
        board.placePiece(createPiece("Pawn", PlayerColor.White, new Vector2Int(x, whitePawnRank)), new Vector2Int(x, whitePawnRank));
    }

    // Place Black pieces (top rank)
    const blackMainRank = 7;
    const blackPawnRank = 6;
    
    board.placePiece(createPiece("Rook", PlayerColor.Black, new Vector2Int(0, blackMainRank)), new Vector2Int(0, blackMainRank));
    board.placePiece(createPiece("Knight", PlayerColor.Black, new Vector2Int(1, blackMainRank)), new Vector2Int(1, blackMainRank));
    board.placePiece(createPiece("Bishop", PlayerColor.Black, new Vector2Int(2, blackMainRank)), new Vector2Int(2, blackMainRank));
    board.placePiece(createPiece("Queen", PlayerColor.Black, new Vector2Int(3, blackMainRank)), new Vector2Int(3, blackMainRank));
    board.placePiece(createPiece("King", PlayerColor.Black, new Vector2Int(4, blackMainRank)), new Vector2Int(4, blackMainRank));
    board.placePiece(createPiece("Bishop", PlayerColor.Black, new Vector2Int(5, blackMainRank)), new Vector2Int(5, blackMainRank));
    board.placePiece(createPiece("Knight", PlayerColor.Black, new Vector2Int(6, blackMainRank)), new Vector2Int(6, blackMainRank));
    board.placePiece(createPiece("Rook", PlayerColor.Black, new Vector2Int(7, blackMainRank)), new Vector2Int(7, blackMainRank));
    
    for (let x = 0; x < 8; x++) {
        board.placePiece(createPiece("Pawn", PlayerColor.Black, new Vector2Int(x, blackPawnRank)), new Vector2Int(x, blackPawnRank));
    }

    return board;
}

/**
 * Create a ChessManagerBundle from a loaded GameState (e.g., from a map file).
 * 
 * @param initialState - The initial game state
 * @param humanPlayer - Which player is human (White or Black). If null, both players are human (HvH mode).
 */
export function createChessManagerBundleFromState(
    initialState: GameState,
    humanPlayer: PlayerColor | null = PlayerColor.White
): ChessManagerBundle {
    const rules = new LastPieceStandingRuleSet();
    const manager = new ChessManager(initialState, rules);

    const getState = () => manager.currentState;

    // Create AI only if we have a human player (not HvH mode)
    const ai = humanPlayer !== null ? new GreedyAI(rules, 3) : null;
    const aiPlayer = humanPlayer !== null 
        ? (humanPlayer === PlayerColor.White ? PlayerColor.Black : PlayerColor.White)
        : null;

    /**
     * Human submits a move → ChessManager executes it.
     * After human move, if game continues and it's AI's turn, AI move is processed after a delay.
     */
    const submitHumanMove = (move: Move) => {
        // In HvH mode, allow any player to move (no validation)
        // In HvA mode, validate it's the human's turn
        if (humanPlayer !== null && manager.currentState.currentPlayer !== humanPlayer) {
            console.warn(`[ChessManagerAdapter] Not ${humanPlayer}'s turn, ignoring move`);
            return;
        }

        // Execute the move
        const result = manager.playMove(move, true); // advanceTurn = true
        
        if (!result.success) {
            console.warn("[ChessManagerAdapter] Move failed:", result);
            return;
        }

        // Notify subscribers that state changed (human move)
        notifySubscribers();

        // If game continues and it's now AI's turn (and we have an AI), let AI play
        if (ai !== null && aiPlayer !== null && !manager.isGameOver() && manager.currentState.currentPlayer === aiPlayer) {
            setTimeout(() => {
                const aiResult = manager.playAITurn(aiPlayer, ai);
                if (aiResult.success) {
                    // Notify subscribers after AI move
                    // Use a small delay to ensure state is fully updated
                    setTimeout(() => {
                        notifySubscribers();
                    }, 10);
                }
            }, 100); // Small delay for better UX
        }
    };

    const undo = () => {
        manager.undo();
        notifySubscribers();
    };

    const redo = () => {
        manager.redo();
        notifySubscribers();
    };

    return { manager, getState, rules, submitHumanMove, undo, redo };
}

/**
 * Create a standard chess game bundle.
 */
export function createChessManagerBundle(): ChessManagerBundle {
    const board = createStandardChessBoard();
    const initialState = GameState.createInitial(board, PlayerColor.White);
    return createChessManagerBundleFromState(initialState, PlayerColor.White);
}

// Note: Subscriber notification is handled in EngineContext.tsx
// This function will be called from there when state changes
export function notifySubscribers() {
    // This will be set by EngineContext
    if ((globalThis as any).__chessSubscribers) {
        ((globalThis as any).__chessSubscribers as Set<() => void>).forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error("[ChessManagerAdapter] Error notifying subscriber:", e);
            }
        });
    }
}

