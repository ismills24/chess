import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Board } from "../../chess-engine/state/Board";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { gridToWorld, SQUARE_SIZE, BoardDimensions } from "./coordinates";
import { tileIdForInstance } from "../../catalog/registry/Catalog";

const LIGHT_COLOR = new THREE.Color("#e8d4b8");
const DARK_COLOR = new THREE.Color("#b58863");
const BOARD_FRAME_COLOR = "#5c4033";

const TILE_COLORS: Record<string, THREE.Color> = {
  SlipperyTile: new THREE.Color("#a8d8ea"),
  GuardianTile: new THREE.Color("#c9a227"),
  FogTile: new THREE.Color("#888888"),
};

interface BoardMeshProps {
  board: Board;
  legalMoves: Set<string>;
}

interface SquareData {
  pos: Vector2Int;
  worldX: number;
  worldZ: number;
  color: THREE.Color;
  tileId: string;
  isLegal: boolean;
}

const BoardMeshInner: React.FC<BoardMeshProps> = ({
  board,
  legalMoves,
}) => {
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
        const tile = board.getTile(pos);
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
    () => squareData.filter((sq) => sq.isLegal),
    [squareData]
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

interface TileIndicatorProps {
  position: [number, number, number];
  tileId: string;
}

const TILE_INDICATOR_COLORS: Record<string, string> = {
  SlipperyTile: "#00bfff",
  GuardianTile: "#ffd700",
  FogTile: "#666666",
};

const TileIndicator: React.FC<TileIndicatorProps> = React.memo(
  ({ position, tileId }) => {
    const color = TILE_INDICATOR_COLORS[tileId];
    if (!color) return null;

    return (
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.45, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    );
  }
);
