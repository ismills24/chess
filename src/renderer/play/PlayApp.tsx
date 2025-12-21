import React, { useState, useEffect, useMemo } from "react";
import { EngineProvider, useEngineState } from "../chess3d/EngineContext";
import { Board3DView } from "../chess3d";
import { loadMap } from "../chess3d/maploader";
import { createChessManagerBundleFromState } from "../chess3d/chessManagerAdapter";
import { MapDefinition } from "../mapbuilder/types";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { DebugPanel } from "../chess3d/DebugPanel";
import { ChessManager } from "../../chess-manager/ChessManager";
import { Button, Stack, Text, Card } from "../ui";
import "./play.css";

export const PlayApp: React.FC<{ map: MapDefinition }> = ({ map }) => {
  const [mode, setMode] = useState<"hva" | "hvh">("hva");
  const [gameKey, setGameKey] = useState(0);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

  // Create bundle from loaded map
  const bundle = useMemo(() => {
    const state = loadMap(map);
    // In HvA mode, White is human. In HvH mode, both are human (pass null)
    const humanPlayer = mode === "hva" ? PlayerColor.White : null;
    return createChessManagerBundleFromState(state, humanPlayer);
  }, [map, mode, gameKey]);

  // Determine which player is human based on mode
  const humanPlayer = mode === "hva" ? PlayerColor.White : null; // In HvH, both are human

  const onNewGame = () => {
    setGameKey((k) => k + 1); // trigger rebuild
  };

  return (
    <div className="play-app">
      <EngineProvider key={gameKey} existing={bundle}>
        <header className="play-header">
          <Stack gap="sm" align="center">
            <Button onClick={onNewGame} variant="primary" size="sm">
              New Game
            </Button>
            <UndoRedoButtons bundle={bundle} />
          </Stack>

          <Stack gap="sm" align="center">
            <div className="play-toggle-group">
              <button
                className={`play-toggle ${mode === "hva" ? "play-toggle--active" : ""}`}
                onClick={() => { setMode("hva"); setGameKey((k) => k + 1); }}
              >
                vs AI
              </button>
              <button
                className={`play-toggle ${mode === "hvh" ? "play-toggle--active" : ""}`}
                onClick={() => { setMode("hvh"); setGameKey((k) => k + 1); }}
              >
                vs Human
              </button>
            </div>

          </Stack>
        </header>

        <main className="play-board">
          <Board3DView />
          <GameOverPopupWrapper manager={bundle.manager} humanPlayer={humanPlayer} />
          <DebugPanel isOpen={debugPanelOpen} onToggle={() => setDebugPanelOpen(!debugPanelOpen)} />
        </main>
      </EngineProvider>
    </div>
  );
};

const UndoRedoButtons: React.FC<{ bundle: ReturnType<typeof createChessManagerBundleFromState> }> = ({
  bundle,
}) => {
  return (
    <>
      <Button onClick={() => bundle.undo()} variant="ghost" size="sm" title="Undo">
        ↩
      </Button>
      <Button onClick={() => bundle.redo()} variant="ghost" size="sm" title="Redo">
        ↪
      </Button>
    </>
  );
};

// Wrapper component that uses the engine context
const GameOverPopupWrapper: React.FC<{
  manager: ChessManager;
  humanPlayer: PlayerColor | null;
}> = ({ manager, humanPlayer }) => {
  // Use engine state to react to changes - this hook requires EngineProvider context
  const state = useEngineState();
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);
  const [lastGameOverState, setLastGameOverState] = useState(false);

  useEffect(() => {
    const checkGameOver = () => {
      const isOver = manager.isGameOver();

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
        const winner = manager.getWinner();

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

    // Set up interval to check game over state
    const interval = setInterval(checkGameOver, 100);
    return () => clearInterval(interval);
  }, [manager, humanPlayer, state, dismissed, lastGameOverState]);

  if (!showPopup) return null;

  return (
    <div className="play-gameover-overlay">
      <div className="play-gameover-card">
        <button
          onClick={() => { setShowPopup(false); setDismissed(true); }}
          className="play-gameover-close"
        >
          ×
        </button>
        <Text as="h2" variant="heading" align="center">
          {message}
        </Text>
      </div>
    </div>
  );
};
