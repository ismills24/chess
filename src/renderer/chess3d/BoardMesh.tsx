import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Board } from "../../chess-engine/state/Board";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { gridToWorld, SQUARE_SIZE, BoardDimensions } from "./coordinates";
import { tileIdForInstance } from "../../catalog/registry/Catalog";
import { Tile } from "../../catalog/tiles/Tile";

const LIGHT_COLOR = new THREE.Color("#e8d4b8");
const DARK_COLOR = new THREE.Color("#b58863");
const BOARD_FRAME_COLOR = "#5c4033";

const TILE_COLORS: Record<string, THREE.Color> = {
  SlipperyTile: new THREE.Color("#a8d8ea"),
  GuardianTile: new THREE.Color("#c9a227"),
  FogTile: new THREE.Color("#888888"),
  WallTile: new THREE.Color("#5c4033"),
  TombTile: new THREE.Color("#6b5b95"),
};

interface BoardMeshProps {
  board: Board;
  legalMoves: Set<string>;
  tilePlacementTargets?: Set<string>;
}

interface SquareData {
  pos: Vector2Int;
  worldX: number;
  worldZ: number;
  color: THREE.Color;
  tileId: string;
  isLegal: boolean;
}

const BoardMeshInner: React.FC<BoardMeshProps> = ({ board, legalMoves, tilePlacementTargets = new Set() }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dimensions: BoardDimensions = useMemo(
    () => ({ width: board.width, height: board.height }),
    [board.width, board.height]
  );

  const squareCount = board.width * board.height;

  const squareData = useMemo<SquareData[]>(() => {
    const data: SquareData[] = [];
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const pos = new Vector2Int(x, y);
        const worldPos = gridToWorld(pos, dimensions);
        const isLight = (x + y) % 2 === 0;
        const tile = board.getTile(pos) as Tile;
        const tileId = tileIdForInstance(tile);
        const baseColor = isLight ? LIGHT_COLOR : DARK_COLOR;
        const color = TILE_COLORS[tileId] ?? baseColor;

        data.push({
          pos,
          worldX: worldPos.x,
          worldZ: worldPos.z,
          color,
          tileId,
          isLegal: legalMoves.has(`${x},${y}`),
        });
      }
    }
    return data;
  }, [board, dimensions, legalMoves]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();

    squareData.forEach((sq, i) => {
      tempMatrix.setPosition(sq.worldX, 0.05, sq.worldZ);
      mesh.setMatrixAt(i, tempMatrix);
      tempColor.copy(sq.color);
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [squareData]);

  const frameWidth = board.width * SQUARE_SIZE + 0.4;
  const frameHeight = board.height * SQUARE_SIZE + 0.4;

  const legalIndicators = useMemo(
    () => squareData.filter((sq) => sq.isLegal && !tilePlacementTargets.has(`${sq.pos.x},${sq.pos.y}`)),
    [squareData, tilePlacementTargets]
  );

  const tilePlacementIndicators = useMemo(
    () => squareData.filter((sq) => tilePlacementTargets.has(`${sq.pos.x},${sq.pos.y}`)),
    [squareData, tilePlacementTargets]
  );

  const tileIndicators = useMemo(
    () => squareData.filter((sq) => sq.tileId !== "StandardTile"),
    [squareData]
  );

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, squareCount]}
        receiveShadow
      >
        <boxGeometry args={[SQUARE_SIZE, 0.1, SQUARE_SIZE]} />
        <meshStandardMaterial />
      </instancedMesh>

      {legalIndicators.map((sq) => (
        <LegalMoveIndicator
          key={`legal-${sq.pos.x}-${sq.pos.y}`}
          position={[sq.worldX, 0.11, sq.worldZ]}
        />
      ))}

      {tilePlacementIndicators.map((sq) => (
        <TilePlacementIndicator
          key={`tile-placement-${sq.pos.x}-${sq.pos.y}`}
          position={[sq.worldX, 0.11, sq.worldZ]}
        />
      ))}

      {tileIndicators.map((sq) => (
        <TileIndicator
          key={`tile-${sq.pos.x}-${sq.pos.y}`}
          position={[sq.worldX, 0.101, sq.worldZ]}
          tileId={sq.tileId}
        />
      ))}

      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[frameWidth, 0.2, frameHeight]} />
        <meshStandardMaterial color={BOARD_FRAME_COLOR} />
      </mesh>
    </group>
  );
};

export const BoardMesh = React.memo(BoardMeshInner);

interface LegalMoveIndicatorProps {
  position: [number, number, number];
}

const LegalMoveIndicator: React.FC<LegalMoveIndicatorProps> = React.memo(
  ({ position }) => (
    <mesh position={position}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshBasicMaterial color="#20a020" transparent opacity={0.7} />
    </mesh>
  )
);

interface TilePlacementIndicatorProps {
  position: [number, number, number];
}

const TilePlacementIndicator: React.FC<TilePlacementIndicatorProps> = React.memo(
  ({ position }) => (
    <mesh position={position}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshBasicMaterial color="#4080ff" transparent opacity={0.7} />
    </mesh>
  )
);

interface TileIndicatorProps {
  position: [number, number, number];
  tileId: string;
}

const TILE_INDICATOR_COLORS: Record<string, string> = {
  SlipperyTile: "#00bfff",
  GuardianTile: "#ffd700",
  FogTile: "#666666",
  WallTile: "#5c4033",
  TombTile: "#8b6f9c",
};

const TileIndicator: React.FC<TileIndicatorProps> = React.memo(
  ({ position, tileId }) => {
    console.log("TileIndicator", tileId);
    const color = TILE_INDICATOR_COLORS[tileId];
    if (!color) return null;

    if (tileId === "GuardianTile") {
      return (
        <group position={position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.44, 32]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <ringGeometry args={[0.28, 0.32, 4]} />
            <meshBasicMaterial color="#ffee55" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0.7} />
          </mesh>
        </group>
      );
    }

    if (tileId === "WallTile") {
      return (
        <group position={position} castShadow scale={2.3}>
          {/* Base slab */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.25, 0.3, 0.08]} />
            <meshStandardMaterial color="#4a3a2a" />
          </mesh>
          {/* Small base/platform */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.3, 0.1, 0.1]} />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
        </group>
      );
    }

    if (tileId === "TombTile") {
      console.log("TombTile", position);
      return (
        <group position={position}>
          {/* Base mound */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.06, 12]} />
            <meshStandardMaterial color="#5a4b66" />
          </mesh>
          {/* Cross upright */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.06]} />
            <meshStandardMaterial color="#d0c6d8" />
          </mesh>
          {/* Cross bar */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.2, 0.06, 0.06]} />
            <meshStandardMaterial color="#d0c6d8" />
          </mesh>
        </group>
      );
    }

    return (
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.45, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    );
  }
);
