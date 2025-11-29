import React, { useState, useEffect } from "react";
import { EngineProvider, useEngineState } from "../chess/EngineContext";
import { BoardView } from "../chess/BoardView";
import { loadMap } from "../maploader/maploader";
import { HumanController } from "../../engine/controllers/HumanController";
import { GreedyAIController } from "../../engine/controllers/GreedyAIController";
import { GameEngine } from "../../engine/core/GameEngine";
import { StandardChessRuleSet } from "../../engine/rules/StandardChess";
import { MapDefinition } from "../mapbuilder/types";
import { ClockView } from "../chess/ClockView";
import { GameClock } from "../../engine/core/GameClock";
import { PlayerColor } from "../../engine/primitives/PlayerColor";
import { TimeExpiryHandlers } from "../../engine/core/TimeExpiryHandler";

export const PlayApp: React.FC<{ map: MapDefinition }> = ({ map }) => {
	const [mode, setMode] = useState<"hva" | "hvh">("hva");
	const [engineKey, setEngineKey] = useState(0);

	// Configurable time budget (e.g., 10 seconds)
	const timeBudgetMs = 10 * 1000;

	// Build a new engine each time engineKey changes
	const makeEngine = () => {
		const state = loadMap(map);
		const rules = new StandardChessRuleSet();

		// Helper to create clock with event publisher callback that will reference the engine
		// The clock uses a TimeExpiryHandler to determine what happens when time expires.
		// Currently uses gameOver handler which sends a TimeOutEvent that goes through interceptors.
		// If not intercepted, it converts to GameOverEvent and ends the game.
		const createClockWithCallback = (humanPlayer: PlayerColor): { clock: GameClock; setEngine: (engine: GameEngine) => void } => {
			let engineRef: GameEngine | null = null;
			const clock = new GameClock(
				timeBudgetMs,
				Date.now(),
				humanPlayer,
				(ev) => {
					// Publish event through engine's internal publish method
					// This ensures TimeOutEvent goes through the interceptor pipeline and is handled properly
					if (engineRef) {
						(engineRef as any)._publishEvent(ev);
					}
				},
				TimeExpiryHandlers.gameOver // Game ends, opponent wins when time expires
			);
			return {
				clock,
				setEngine: (engine: GameEngine) => { engineRef = engine; }
			};
		};

		if (mode === "hva") {
			const human = new HumanController(rules);
			const ai = new GreedyAIController(rules, 3);
			// Human plays White in HvA mode
			const { clock, setEngine } = createClockWithCallback(PlayerColor.White);
			const engine = new GameEngine(state, human, ai, rules, clock);
			setEngine(engine);
			return engine;
		} else {
			// Human vs Human → two human controllers
			const white = new HumanController(rules);
			const black = new HumanController(rules);
			// For HvH, we'll track White's clock (could be extended to track both)
			const { clock, setEngine } = createClockWithCallback(PlayerColor.White);
			const engine = new GameEngine(state, white, black, rules, clock);
			setEngine(engine);
			return engine;
		}
	};

	const engine = makeEngine();
	// Determine which player is human based on mode
	const humanPlayer = mode === "hva" ? PlayerColor.White : null; // In HvH, both are human

	const onNewGame = () => {
		setEngineKey((k) => k + 1); // trigger rebuild
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* engineKey forces EngineProvider + BoardView to reset */}
			<EngineProvider key={engineKey} existing={engine}>
				<header style={{ padding: 8, borderBottom: "1px solid #ccc", display: "flex", gap: 12, alignItems: "center" }}>
					<button onClick={onNewGame}>New Game</button>
					<UndoRedoButtons engine={engine} onBump={() => setEngineKey((k) => k + 1)} />
					<span>Mode:</span>
					<button
						onClick={() => {
							setMode("hva");
							setEngineKey((k) => k + 1);
						}}
						style={{ fontWeight: mode === "hva" ? "bold" : "normal" }}
					>
						Human vs AI
					</button>
					<button
						onClick={() => {
							setMode("hvh");
							setEngineKey((k) => k + 1);
						}}
						style={{ fontWeight: mode === "hvh" ? "bold" : "normal" }}
					>
						Human vs Human
					</button>
					<div style={{ marginLeft: "auto" }}>
						<ClockView />
					</div>
				</header>

				<div style={{ flex: 1, position: "relative" }}>
					<BoardView />
					<GameOverPopupWrapper engine={engine} humanPlayer={humanPlayer} />
				</div>
			</EngineProvider>
		</div>
	);
};

const UndoRedoButtons: React.FC<{ engine: GameEngine; onBump: () => void }> = ({ engine, onBump }) => {
	const onUndo = () => {
		(engine as any).undoLastMove();
		// trigger UI update without rebuilding engine
		(engine as any)._notify?.();
	};
	const onRedo = () => {
		(engine as any).redoLastMove();
		(engine as any)._notify?.();
	};
	return (
		<>
			<button onClick={onUndo} title="Undo last move">Undo</button>
			<button onClick={onRedo} title="Redo last move">Redo</button>
		</>
	);
};

// Wrapper component that uses the engine context
const GameOverPopupWrapper: React.FC<{ engine: GameEngine; humanPlayer: PlayerColor | null }> = ({ engine, humanPlayer }) => {
	// Use engine state to react to changes - this hook requires EngineProvider context
	const state = useEngineState();
	const [showPopup, setShowPopup] = useState(false);
	const [message, setMessage] = useState<string>("");
	const [dismissed, setDismissed] = useState(false);
	const [lastGameOverState, setLastGameOverState] = useState(false);

	useEffect(() => {
		const checkGameOver = () => {
			const isOver = engine.isGameOver();
			
			// If game just transitioned from not-over to over, reset dismissed state
			if (isOver && !lastGameOverState) {
				setDismissed(false);
				setLastGameOverState(true);
			} else if (!isOver && lastGameOverState) {
				// Game is no longer over (new game started)
				setDismissed(false);
				setLastGameOverState(false);
				setShowPopup(false);
				return;
			}
			
			// If game is over and popup hasn't been dismissed, show it
			if (isOver && !dismissed) {
				const winner = engine.getWinner();
				
				if (humanPlayer !== null) {
					// HvA mode: show message for human player
					if (winner === humanPlayer) {
						setMessage("You Win!");
					} else if (winner !== null) {
						setMessage("You Lose!");
					} else {
						setMessage("Game Over - Draw!");
					}
					setShowPopup(true);
				} else {
					// HvH mode: show result for both players
					if (winner === PlayerColor.White) {
						setMessage("White Wins!");
					} else if (winner === PlayerColor.Black) {
						setMessage("Black Wins!");
					} else {
						setMessage("Game Over - Draw!");
					}
					setShowPopup(true);
				}
			} else if (!isOver) {
				setShowPopup(false);
			}
		};

		// Check immediately
		checkGameOver();

		// Subscribe to engine events
		const originalHandler = engine.onEventPublished;
		engine.onEventPublished = (ev) => {
			originalHandler?.(ev);
			// Small delay to ensure state is updated
			setTimeout(checkGameOver, 10);
		};

		// Also set up interval as fallback
		const interval = setInterval(checkGameOver, 100);

		return () => {
			clearInterval(interval);
			engine.onEventPublished = originalHandler;
		};
	}, [engine, humanPlayer, state, dismissed, lastGameOverState]); // React to state changes

	if (!showPopup) return null;

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.7)",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				zIndex: 1000,
			}}
		>
			<div
				style={{
					position: "relative",
					backgroundColor: "white",
					padding: "40px",
					borderRadius: "8px",
					boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
					textAlign: "center",
					minWidth: "300px",
				}}
			>
				{/* X button in the corner */}
				<button
					onClick={() => {
						setShowPopup(false);
						setDismissed(true);
					}}
					style={{
						position: "absolute",
						top: "10px",
						right: "10px",
						background: "none",
						border: "none",
						fontSize: "24px",
						cursor: "pointer",
						color: "#666",
						width: "30px",
						height: "30px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 0,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = "#000";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = "#666";
					}}
				>
					×
				</button>
				<h2 style={{ margin: "0 0 20px 0", fontSize: "32px", fontWeight: "bold" }}>
					{message}
				</h2>
			</div>
		</div>
	);
};
