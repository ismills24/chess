import React, { useState, useEffect, useMemo } from "react";
import { EngineProvider, useEngineState } from "../chess/EngineContext";
import { BoardView } from "../chess/BoardView";
import { Board3DView } from "../chess3d";
import { loadMap } from "../maploader/maploader";
import { createChessManagerBundleFromState } from "../chess/chessManagerAdapter";
import { MapDefinition } from "../mapbuilder/types";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { ChessManager } from "../../chess-manager/ChessManager";

export const PlayApp: React.FC<{ map: MapDefinition }> = ({ map }) => {
  const [mode, setMode] = useState<"hva" | "hvh">("hva");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [gameKey, setGameKey] = useState(0);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* gameKey forces bundle to rebuild */}
      <EngineProvider key={gameKey} existing={bundle}>
        <header
          style={{
            padding: 8,
            borderBottom: "1px solid #ccc",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button onClick={onNewGame}>New Game</button>
          <UndoRedoButtons
            bundle={bundle}
            onBump={() => setGameKey((k) => k + 1)}
          />
          <span>Mode:</span>
          <button
            onClick={() => {
              setMode("hva");
              setGameKey((k) => k + 1);
            }}
            style={{ fontWeight: mode === "hva" ? "bold" : "normal" }}
          >
            Human vs AI
          </button>
          <button
            onClick={() => {
              setMode("hvh");
              setGameKey((k) => k + 1);
            }}
            style={{ fontWeight: mode === "hvh" ? "bold" : "normal" }}
          >
            Human vs Human
          </button>
          <span style={{ marginLeft: 16 }}>View:</span>
          <button
            onClick={() => setViewMode("2d")}
            style={{ fontWeight: viewMode === "2d" ? "bold" : "normal" }}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode("3d")}
            style={{ fontWeight: viewMode === "3d" ? "bold" : "normal" }}
          >
            3D
          </button>
        </header>

        <div style={{ flex: 1, position: "relative" }}>
          {viewMode === "2d" ? <BoardView /> : <Board3DView />}
          <GameOverPopupWrapper manager={bundle.manager} humanPlayer={humanPlayer} />
        </div>
      </EngineProvider>
    </div>
  );
};

const UndoRedoButtons: React.FC<{ bundle: ReturnType<typeof createChessManagerBundleFromState>; onBump: () => void }> = ({
  bundle,
  onBump,
}) => {
  const onUndo = () => {
    bundle.undo();
  };
  const onRedo = () => {
    bundle.redo();
  };
  return (
    <>
      <button onClick={onUndo} title="Undo last move">
        Undo
      </button>
      <button onClick={onRedo} title="Redo last move">
        Redo
      </button>
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

    return () => {
      clearInterval(interval);
    };
  }, [manager, humanPlayer, state, dismissed, lastGameOverState]); // React to state changes

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
        <h2
          style={{ margin: "0 0 20px 0", fontSize: "32px", fontWeight: "bold" }}
        >
          {message}
        </h2>
      </div>
    </div>
  );
};
