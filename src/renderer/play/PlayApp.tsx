import React, { useState } from "react";
import { EngineProvider } from "../chess/EngineContext";
import { BoardView } from "../chess/BoardView";
import { DebugPanel } from "../chess/DebugPanel";
import { loadMap } from "../maploader/maploader";
import { HumanController } from "../../engine/controllers/HumanController";
import { GreedyAIController } from "../../engine/controllers/GreedyAIController";
import { GameEngine } from "../../engine/core/GameEngine";
import { LastPieceStandingRuleSet } from "../../engine/rules/LastPieceStanding";
import { MapDefinition } from "../mapbuilder/types";

export const PlayApp: React.FC<{ map: MapDefinition }> = ({ map }) => {
    const [mode, setMode] = useState<"hva" | "hvh">("hva");
    const [engineKey, setEngineKey] = useState(0);

    // Build a new engine each time engineKey changes
    const makeEngine = () => {
        const state = loadMap(map);
        const rules = new LastPieceStandingRuleSet();

        if (mode === "hva") {
            const human = new HumanController(rules);
            const ai = new GreedyAIController(rules, 3);
            return new GameEngine(state, human, ai, rules);
        } else {
            // Human vs Human → two human controllers
            const white = new HumanController(rules);
            const black = new HumanController(rules);
            return new GameEngine(state, white, black, rules);
        }
    };

    const engine = makeEngine();

    const onNewGame = () => {
        setEngineKey((k) => k + 1); // trigger rebuild
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <header style={{ padding: 8, borderBottom: "1px solid #ccc", display: "flex", gap: 12 }}>
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
            </header>

            <div style={{ flex: 1, position: "relative" }}>
                {/* engineKey forces EngineProvider + BoardView to reset */}
                <EngineProvider key={engineKey} existing={engine}>
                    <BoardView />
                    <DebugPanel />
                </EngineProvider>
            </div>
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
