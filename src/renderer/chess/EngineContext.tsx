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
                    (existing as any).whiteController.submitMove(move);
                    (existing as any).runTurn();
                    if (!existing.isGameOver()) (existing as any).runTurn();
                },
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
