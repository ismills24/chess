import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import { createEngineBundle, EngineBundle } from "./engineAdapter";
import "../../engine/core/Turns";

const EngineCtx = createContext<EngineBundle | null>(null);

export const EngineProvider: React.FC<{ children: React.ReactNode; existing?: EngineBundle["engine"] }> = ({ children, existing }) => {
    const bundleRef = useRef<EngineBundle | null>(null);
    if (!bundleRef.current) {
        if (existing) {
            bundleRef.current = {
                engine: existing,
                getState: () => existing.currentState,
                rules: (existing as any).ruleset,
                submitHumanMove: (move) => {
                    // Submit move to the current player's controller
                    const currentPlayer = existing.currentState.currentPlayer;
                    if (currentPlayer === "White") {
                        (existing as any).whiteController.submitMove(move);
                    } else {
                        (existing as any).blackController.submitMove(move);
                    }
                    (existing as any).runTurn();
                    
                    // If the next player is AI, automatically process their turn
                    if (!existing.isGameOver()) {
                        const nextPlayer = existing.currentState.currentPlayer;
                        const nextController = nextPlayer === "White" 
                            ? (existing as any).whiteController 
                            : (existing as any).blackController;
                        
                        // Check if the next controller is AI by checking if it's an instance of GreedyAIController
                        if (nextController && nextController.constructor.name === 'GreedyAIController') {
                            setTimeout(() => {
                                (existing as any).runTurn();
                            }, 10);
                        }
                    }
                },
            };
            // Attach a manual notifier for UI updates on non-event mutations (e.g., undo/redo)
            if (!((existing as any)._subs)) (existing as any)._subs = new Set<() => void>();
            (existing as any)._notify = () => {
                for (const f of (existing as any)._subs as Set<() => void>) f();
            };
        } else {
            bundleRef.current = createEngineBundle();
        }
    }

    return (
        <EngineCtx.Provider value={bundleRef.current}>
            {children}
        </EngineCtx.Provider>
    );
};



export function useEngine() {
    const ctx = useContext(EngineCtx);
    if (!ctx) throw new Error("useEngine must be used within EngineProvider");
    return ctx;
}

/** reactive state hook backed by engine history */
export function useEngineState() {
    const { engine, getState } = useEngine();
    const subscribe = (fn: () => void) => {
        // tie into EngineProvider's subscriber set via engine.onEventPublished
        // we’ll intercept through a local indirection:
        const provider = (engine.onEventPublished as any)?._provider;
        // Fallback: directly add to a Set we keep on the engine (attach ad hoc)
        if (!((engine as any)._subs)) (engine as any)._subs = new Set<() => void>();
        (engine as any)._subs.add(fn);
        const orig = engine.onEventPublished;
        engine.onEventPublished = (ev) => {
            (orig as (ev: any) => void | undefined)?.(ev);
            for (const f of (engine as any)._subs as Set<() => void>) f();
        };
        return () => {
            ((engine as any)._subs as Set<() => void>).delete(fn);
        };
    };

    // useSyncExternalStore for consistent updates
    return useSyncExternalStore(subscribe, getState, getState);
}
