import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEngine, useEngineState } from "../chess/EngineContext";
import "./board3d.css";
import { Vector2Int } from "../../engine/primitives/Vector2Int";
import { Move } from "../../engine/primitives/Move";
import { BoardMesh } from "./BoardMesh";
import { Piece3D } from "./Piece3D";
import { getCameraPosition, BoardDimensions, worldToGrid } from "./coordinates";
import { GeometryProvider } from "./pieces/GeometryStore";

const BOARD_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);

const CameraSetup: React.FC<{
  position: [number, number, number];
  enabled: boolean;
}> = ({ position, enabled }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (enabled) {
      camera.position.set(...position);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, position, enabled]);

  return null;
};

const FPSCounter: React.FC<{ fpsRef: React.RefObject<number> }> = ({
  fpsRef,
}) => {
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      fpsRef.current = frames.current;
      frames.current = 0;
      lastTime.current = now;
    }
  });

  return null;
};

const FPSDisplay: React.FC<{ fpsRef: React.RefObject<number> }> = ({
  fpsRef,
}) => {
  const [displayFps, setDisplayFps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayFps(fpsRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [fpsRef]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.7)",
        color: "#0f0",
        padding: "6px 10px",
        borderRadius: 4,
        fontFamily: "monospace",
        fontSize: 13,
      }}
    >
      {displayFps} FPS
    </div>
  );
};

const ClickHandler: React.FC<{
  dimensions: BoardDimensions;
  onSquareClick: (pos: Vector2Int) => void;
}> = ({ dimensions, onSquareClick }) => {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersection = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(BOARD_PLANE, intersection);

      if (hit) {
        const gridPos = worldToGrid(intersection.x, intersection.z, dimensions);
        if (
          gridPos.x >= 0 &&
          gridPos.x < dimensions.width &&
          gridPos.y >= 0 &&
          gridPos.y < dimensions.height
        ) {
          onSquareClick(gridPos);
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [camera, gl, raycaster, dimensions, onSquareClick]);

  return null;
};

export const Board3DView: React.FC = () => {
  const state = useEngineState();
  const { rules, submitHumanMove } = useEngine();
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cameraControlsEnabled, setCameraControlsEnabled] = useState(false);
  const fpsRef = useRef(0);

  const dimensions: BoardDimensions = useMemo(
    () => ({ width: state.board.width, height: state.board.height }),
    [state.board.width, state.board.height]
  );

  const cameraPosition = useMemo(
    () => getCameraPosition(dimensions),
    [dimensions]
  );

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    const piece = state.board.getPieceAt(
      new Vector2Int(selected.x, selected.y)
    );
    if (!piece) return new Set<string>();
    if (piece.owner !== state.currentPlayer) return new Set<string>();
    return new Set(
      rules.getLegalMoves(state, piece).map((m) => `${m.to.x},${m.to.y}`)
    );
  }, [selected, state, rules]);

  const handleSquareClick = useCallback(
    (pos: Vector2Int) => {
      const piece = state.board.getPieceAt(pos);

      if (selected) {
        if (legalTargets.has(`${pos.x},${pos.y}`)) {
          const from = new Vector2Int(selected.x, selected.y);
          const mover = state.board.getPieceAt(from);
          if (mover) {
            const mv = new Move(from, pos, mover);
            submitHumanMove(mv);
            setSelected(null);
          }
          return;
        }
        if (piece && piece.owner === state.currentPlayer) {
          setSelected({ x: pos.x, y: pos.y });
        } else {
          setSelected(null);
        }
      } else {
        if (piece && piece.owner === state.currentPlayer) {
          setSelected({ x: pos.x, y: pos.y });
        }
      }
    },
    [selected, legalTargets, state, submitHumanMove]
  );

  const pieces = state.board.getAllPieces();

  const resetCamera = useCallback(() => {
    setCameraControlsEnabled(false);
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraControlsEnabled((prev) => !prev);
  }, []);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      className="board3d-container"
    >
      <FPSDisplay fpsRef={fpsRef} />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 100,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={toggleCamera}
          style={{
            padding: "8px 12px",
            background: cameraControlsEnabled ? "#4a9eff" : "#2d2d44",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {cameraControlsEnabled ? "🎥 Camera On" : "🎥 Camera Off"}
        </button>
        {cameraControlsEnabled && (
          <button
            onClick={resetCamera}
            style={{
              padding: "8px 12px",
              background: "#2d2d44",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Reset View
          </button>
        )}
      </div>

      <Canvas
        camera={{
          position: cameraPosition,
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        shadows
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          alpha: false,
        }}
        frameloop="always"
      >
        <color attach="background" args={["#1a1a2e"]} />
        <CameraSetup
          position={cameraPosition}
          enabled={!cameraControlsEnabled}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 8]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-5, 8, -3]} intensity={0.4} />

        <ClickHandler
          dimensions={dimensions}
          onSquareClick={handleSquareClick}
        />

        <GeometryProvider>
          <BoardMesh board={state.board} legalMoves={legalTargets} />

          {pieces.map((piece) => (
            <Piece3D
              key={piece.id}
              piece={piece}
              dimensions={dimensions}
              isSelected={
                selected?.x === piece.position.x &&
                selected?.y === piece.position.y
              }
            />
          ))}
        </GeometryProvider>

        {cameraControlsEnabled && (
          // Polar angle limits: min=30° (prevent looking from below), max=82° (prevent top-down)
          <OrbitControls
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={4}
            maxDistance={25}
            target={[0, 0, 0]}
          />
        )}

        <FPSCounter fpsRef={fpsRef} />
      </Canvas>
    </div>
  );
};
