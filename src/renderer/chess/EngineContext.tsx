import React, { createContext, useContext, useRef, useSyncExternalStore, useCallback, useMemo } from "react";
import { createChessManagerBundle, ChessManagerBundle } from "./chessManagerAdapter";
import { GameState } from "../../chess-engine/state/GameState";
import { StandardChessRuleSet } from "../../catalog/rulesets/StandardChess";

// Legacy type for backward compatibility - wraps ChessManagerBundle
type EngineBundle = {
    engine: any; // Not used, but kept for compatibility
    getState: () => GameState;
    rules: StandardChessRuleSet;
    submitHumanMove: (move: any) => void;
};

// Global subscriber set for state change notifications
const globalSubscribers = new Set<() => void>();

// Expose to chessManagerAdapter for notifications
(globalThis as any).__chessSubscribers = globalSubscribers;

function notifySubscribers() {
    globalSubscribers.forEach(fn => fn());
}

const EngineCtx = createContext<ChessManagerBundle | null>(null);

export const EngineProvider: React.FC<{ children: React.ReactNode; existing?: ChessManagerBundle | any }> = ({ children, existing }) => {
    // Use existing bundle if provided, otherwise create default
    const baseBundle = useMemo<ChessManagerBundle>(() => {
        if (existing) {
            // Check if it's already a ChessManagerBundle
            if (existing.manager && existing.getState && existing.submitHumanMove) {
                return existing as ChessManagerBundle;
            } else {
                // Legacy support: if existing engine is provided, we'd need to migrate it
                // For now, just create a new bundle
                console.warn("[EngineProvider] Legacy 'existing' prop not supported with new architecture");
                return createChessManagerBundle();
            }
        } else {
            return createChessManagerBundle();
        }
    }, [existing]);

    // Wrap submitHumanMove to notify subscribers
    const wrappedSubmitHumanMove = useCallback((move: any) => {
        const currentIndex = baseBundle.manager.currentIndex;
        baseBundle.submitHumanMove(move);
        
        // Notify subscribers if state changed (submitHumanMove already notifies, but we do it here too for safety)
        if (baseBundle.manager.currentIndex !== currentIndex) {
            notifySubscribers();
        }
    }, [baseBundle]);

    // Wrap undo/redo to notify subscribers
    const wrappedUndo = useCallback(() => {
        const currentIndex = baseBundle.manager.currentIndex;
        baseBundle.undo();
        if (baseBundle.manager.currentIndex !== currentIndex) {
            notifySubscribers();
        }
    }, [baseBundle]);

    const wrappedRedo = useCallback(() => {
        const currentIndex = baseBundle.manager.currentIndex;
        baseBundle.redo();
        if (baseBundle.manager.currentIndex !== currentIndex) {
            notifySubscribers();
        }
    }, [baseBundle]);

    // Create wrapped bundle with notification support
    const wrappedBundle = useMemo<ChessManagerBundle>(() => ({
        ...baseBundle,
        submitHumanMove: wrappedSubmitHumanMove,
        undo: wrappedUndo,
        redo: wrappedRedo,
    }), [baseBundle, wrappedSubmitHumanMove, wrappedUndo, wrappedRedo]);

    return (
        <EngineCtx.Provider value={wrappedBundle}>
            {children}
        </EngineCtx.Provider>
    );
};

export function useEngine(): EngineBundle {
    const ctx = useContext(EngineCtx);
    if (!ctx) throw new Error("useEngine must be used within EngineProvider");
    
    // Return legacy-compatible interface
    return {
        engine: null, // Not used in new architecture
        getState: ctx.getState,
        rules: ctx.rules,
        submitHumanMove: ctx.submitHumanMove,
    };
}

/** reactive state hook backed by ChessManager history */
export function useEngineState() {
    const ctx = useContext(EngineCtx);
    if (!ctx) throw new Error("useEngineState must be used within EngineProvider");
    
    const subscribe = useCallback((fn: () => void) => {
        globalSubscribers.add(fn);
        return () => {
            globalSubscribers.delete(fn);
        };
    }, []);

    // useSyncExternalStore for consistent updates
    return useSyncExternalStore(
        subscribe,
        () => ctx.getState(),
        () => ctx.getState()
    );
}
