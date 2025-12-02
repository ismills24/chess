import { Vector2Int } from "../../engine/primitives/Vector2Int";

export const SQUARE_SIZE = 1;

export interface BoardDimensions {
  width: number;
  height: number;
}

/**
 * Grid to world: worldPos = gridPos * squareSize - boardCenter + halfSquare
 * Centers the board at origin and positions at square centers
 */
export function gridToWorld(
  gridPos: Vector2Int | { x: number; y: number },
  dimensions: BoardDimensions
): { x: number; z: number } {
  const gx = gridPos.x;
  const gy = gridPos.y;
  return {
    x:
      gx * SQUARE_SIZE - (dimensions.width * SQUARE_SIZE) / 2 + SQUARE_SIZE / 2,
    z:
      gy * SQUARE_SIZE -
      (dimensions.height * SQUARE_SIZE) / 2 +
      SQUARE_SIZE / 2,
  };
}

/**
 * World to grid: gridPos = floor((worldPos + boardCenter) / squareSize)
 * Inverse of gridToWorld, clamped to valid board indices
 */
export function worldToGrid(
  worldX: number,
  worldZ: number,
  dimensions: BoardDimensions
): Vector2Int {
  const gx = Math.floor(
    (worldX + (dimensions.width * SQUARE_SIZE) / 2) / SQUARE_SIZE
  );
  const gy = Math.floor(
    (worldZ + (dimensions.height * SQUARE_SIZE) / 2) / SQUARE_SIZE
  );
  return new Vector2Int(
    Math.max(0, Math.min(dimensions.width - 1, gx)),
    Math.max(0, Math.min(dimensions.height - 1, gy))
  );
}

/**
 * Camera scales with board: distance and height proportional to largest dimension
 * Position offset creates an angled view from corner
 */
export function getCameraPosition(
  dimensions: BoardDimensions
): [number, number, number] {
  const boardSize = Math.max(dimensions.width, dimensions.height);
  const distance = boardSize * 1.1;
  const height = boardSize * 0.9;
  return [-distance * 0.5, height, -distance];
}
