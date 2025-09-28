import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import { createEngineBundle, EngineBundle } from "./engineAdapter";

const EngineCtx = createContext<EngineBundle | null>(null);

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const bundleRef = useRef<EngineBundle | null>(null);
    if (!bundleRef.current) {
        bundleRef.current = createEngineBundle();
    }

    // subscribe to engine events → simple store using .onEventPublished
    const subscribers = useRef(new Set<() => void>());

    const bundle = useMemo(() => {
        const b = bundleRef.current!;
        b.engine.onEventPublished = () => {
            for (const fn of subscribers.current) fn();
        };
        return b;
    }, []);

    const value = bundle;

    return <EngineCtx.Provider value={value}>{children}</EngineCtx.Provider>;
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
