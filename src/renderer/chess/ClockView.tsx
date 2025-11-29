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

	useEffect(() => {
		try {
			console.log(`[ClockView] mounted; engine? ${!!engine}, clock? ${!!clock}`);
		} catch {}
	}, []);

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
				console.log(`[ClockView] event received; ticking=${newTicking}, remaining=${newRemaining}ms`);
				setTicking(newTicking);
				setRemainingMs(newRemaining);
			};
			eng._subs.add(subscriber);
			// Also check initial state
			const c = (engine as any).gameClock;
			if (c) {
				const initialTicking = Boolean(c.ticking);
				const initialRemaining = c.getRemaining();
				console.log(`[ClockView] initial state; ticking=${initialTicking}, remaining=${initialRemaining}ms`);
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
				console.log(`[ClockView] interval setup: no clock`);
				return;
			}
			if (ticking) {
				console.log(`[ClockView] starting interval (ticking=true)`);
				if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
				intervalRef.current = (globalThis as any).setInterval(() => {
					try {
						const rem = c.getRemaining();
						setRemainingMs(rem);
						// Log every second to debug
						if (Math.floor(rem / 1000) % 10 === 0 && rem % 1000 < 100) {
							console.log(`[ClockView] interval tick: remaining=${rem}ms (${formatMs(rem)})`);
						}
					} catch (e) {
						console.error(`[ClockView] interval tick error`, e);
					}
				}, 100);
				return () => {
					console.log(`[ClockView] cleaning up interval`);
					if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
					intervalRef.current = null;
				};
			} else {
				console.log(`[ClockView] stopping interval (ticking=false)`);
				if (intervalRef.current != null) (globalThis as any).clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		} catch (e) {
			console.error(`[ClockView] interval setup error`, e);
		}
	}, [engine, ticking]);

	if (!clock) {
		console.log(`[ClockView] no clock present; hiding`);
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
