import React from "react";
import { Board } from "../../engine/board/Board";
import { Vector2Int } from "../../engine/primitives/Vector2Int";
import { gridToWorld, SQUARE_SIZE, BoardDimensions } from "./coordinates";
import { tileIdForInstance } from "../../shared/entityRegistry";

const LIGHT_COLOR = "#e8d4b8";
const DARK_COLOR = "#b58863";
const BOARD_FRAME_COLOR = "#5c4033";

interface BoardMeshProps {
  board: Board;
  legalMoves: Set<string>;
  onSquareClick: (pos: Vector2Int) => void;
}

export const BoardMesh: React.FC<BoardMeshProps> = ({
  board,
  legalMoves,
  onSquareClick,
}) => {
  const squares: React.ReactNode[] = [];
  const dimensions: BoardDimensions = {
    width: board.width,
    height: board.height,
  };

  for (let x = 0; x < board.width; x++) {
    for (let y = 0; y < board.height; y++) {
      const pos = new Vector2Int(x, y);
      const worldPos = gridToWorld(pos, dimensions);
      // Checkerboard pattern: even sum = light, odd sum = dark
      const isLight = (x + y) % 2 === 0;
      const isLegal = legalMoves.has(`${x},${y}`);
      const tile = board.getTile(pos);
      const tileId = tileIdForInstance(tile);

      squares.push(
        <BoardSquare
          key={`${x}-${y}`}
          position={[worldPos.x, 0.05, worldPos.z]}
          isLight={isLight}
          isLegal={isLegal}
          tileId={tileId}
          onClick={() => onSquareClick(pos)}
        />
      );
    }
  }

  // Frame extends 0.2 units past board edge on each side (0.4 total padding)
  const frameWidth = board.width * SQUARE_SIZE + 0.4;
  const frameHeight = board.height * SQUARE_SIZE + 0.4;

  return (
    <group>
      {squares}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[frameWidth, 0.2, frameHeight]} />
        <meshStandardMaterial color={BOARD_FRAME_COLOR} />
      </mesh>
    </group>
  );
};

interface BoardSquareProps {
  position: [number, number, number];
  isLight: boolean;
  isLegal: boolean;
  tileId: string;
  onClick: () => void;
}

const BoardSquare: React.FC<BoardSquareProps> = ({
  position,
  isLight,
  isLegal,
  tileId,
  onClick,
}) => {
  const baseColor = isLight ? LIGHT_COLOR : DARK_COLOR;
  const tileColor = getTileColor(tileId, baseColor);

  return (
    <group position={position} onClick={onClick}>
      <mesh receiveShadow>
        <boxGeometry args={[SQUARE_SIZE, 0.1, SQUARE_SIZE]} />
        <meshStandardMaterial color={tileColor} />
      </mesh>
      {isLegal && <LegalMoveIndicator />}
      {tileId !== "StandardTile" && <TileIndicator tileId={tileId} />}
    </group>
  );
};

const LegalMoveIndicator: React.FC = () => {
  return (
    <mesh position={[0, 0.06, 0]}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshBasicMaterial color="#20a020" transparent opacity={0.7} />
    </mesh>
  );
};

interface TileIndicatorProps {
  tileId: string;
}

const TileIndicator: React.FC<TileIndicatorProps> = ({ tileId }) => {
  const color = getTileIndicatorColor(tileId);
  if (!color) return null;

  return (
    // Rotate -90° around X axis to lay ring flat on the XZ plane
    <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.38, 0.45, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};

function getTileColor(tileId: string, baseColor: string): string {
  switch (tileId) {
    case "SlipperyTile":
      return "#a8d8ea";
    case "GuardianTile":
      return "#c9a227";
    case "FogTile":
      return "#888888";
    default:
      return baseColor;
  }
}

function getTileIndicatorColor(tileId: string): string | null {
  switch (tileId) {
    case "SlipperyTile":
      return "#00bfff";
    case "GuardianTile":
      return "#ffd700";
    case "FogTile":
      return "#666666";
    default:
      return null;
  }
}
