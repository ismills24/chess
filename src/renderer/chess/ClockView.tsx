import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEngine } from "./EngineContext";

function formatMs(ms: number): string {
	const clamped = Math.max(0, Math.floor(ms));
	const totalSeconds = Math.floor(clamped / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const ClockView: React.FC = () => {
	const { engine } = useEngine();
	const clock: any = (engine as any)?.gameClock ?? null;
	const [remainingMs, setRemainingMs] = useState<number>(() => (clock ? clock.getRemaining() : 0));
	const [ticking, setTicking] = useState<boolean>(() => (clock ? !!clock.ticking : false));
	const intervalRef = useRef<number | null>(null);

	// Subscribe to engine publishes to refresh ticking state quickly on events
	useEffect(() => {
		try {
			const eng: any = engine as any;
			if (!eng) return;
			if (!eng._subs) eng._subs = new Set<() => void>();
			const subscriber = () => {
				const c = (engine as any).gameClock;
				const newTicking = Boolean(c?.ticking);
				const newRemaining = c ? c.getRemaining() : 0;
				setTicking(newTicking);
				setRemainingMs(newRemaining);
			};
			eng._subs.add(subscriber);
			// Also check initial state
			const c = (engine as any).gameClock;
			if (c) {
				const initialTicking = Boolean(c.ticking);
				const initialRemaining = c.getRemaining();
				setTicking(initialTicking);
				setRemainingMs(initialRemaining);
			}
			return () => {
				eng._subs.delete(subscriber);
			};
		} catch (e) {
			console.error(`[ClockView] subscribe error`, e);
		}
	}, [engine]);

	// Drive a local interval while ticking to keep display smooth
	useEffect(() => {
		try {
			const c = (engine as any).gameClock;
			if (!c) {
				return;
			}
			if (ticking) {
				if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
				intervalRef.current = (globalThis as any).setInterval(() => {
					try {
						const rem = c.getRemaining();
						setRemainingMs(rem);
					} catch (e) {
						console.error(`[ClockView] interval tick error`, e);
					}
				}, 100);
				return () => {
					if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
					intervalRef.current = null;
				};
			} else {
				if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		} catch (e) {
			console.error(`[ClockView] interval setup error`, e);
		}
	}, [engine, ticking]);

	if (!clock) {
		return null;
	}

	const danger = remainingMs <= 10000; // last 10s
	return (
		<div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
			<span style={{ fontWeight: 600, fontSize: "18px" }}>Time:</span>
			<span
				style={{
					fontVariantNumeric: "tabular-nums",
					fontFamily: "monospace",
					fontSize: "24px",
					fontWeight: "bold",
					padding: "8px 16px",
					borderRadius: 6,
					background: danger ? "#ffe5e5" : "#f2f2f2",
					color: danger ? "#a40000" : "#333",
					border: danger ? "2px solid #ff0000" : "2px solid #ddd",
				}}
			>
				{formatMs(remainingMs)}
			</span>
		</div>
	);
};
